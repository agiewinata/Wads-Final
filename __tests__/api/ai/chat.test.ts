import { NextRequest } from 'next/server'
import { POST } from '@/app/api/ai/chat/route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/auth', () => ({
  auth: { api: { getSession: jest.fn() } },
}))
jest.mock('next/headers', () => ({
  headers: jest.fn().mockResolvedValue(new Headers()),
}))
jest.mock('@/lib/prisma', () => ({
  prisma: { task: { findMany: jest.fn() } },
}))

const mockGetSession = jest.mocked(auth.api.getSession)
const mockFindMany = jest.mocked(prisma.task.findMany)

const FAKE_SESSION = { user: { id: 'u1', name: 'Alex' } }

function ndjsonStream(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder()
  return new ReadableStream({
    start(ctrl) {
      for (const chunk of chunks) {
        ctrl.enqueue(enc.encode(JSON.stringify({ message: { content: chunk }, done: false }) + '\n'))
      }
      ctrl.enqueue(enc.encode(JSON.stringify({ done: true }) + '\n'))
      ctrl.close()
    },
  })
}

async function drainStream(res: Response): Promise<string> {
  const reader = res.body!.getReader()
  const dec = new TextDecoder()
  let out = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    out += dec.decode(value)
  }
  return out
}

function makeReq(body: object) {
  return new NextRequest('http://localhost/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockFindMany.mockResolvedValue([])
})

describe('POST /api/ai/chat', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null)

    const res = await POST(makeReq({ messages: [{ role: 'user', content: 'hi' }] }))

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('streams NDJSON text chunks from Ollama', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: ndjsonStream(['Hello', ', ', 'world']),
    })

    const res = await POST(makeReq({ messages: [{ role: 'user', content: 'hi' }] }))

    expect(res.status).toBe(200)
    expect(await drainStream(res)).toBe('Hello, world')
  })

  it('uses gemma4:26b when images are attached', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, body: ndjsonStream(['ok']) })
    global.fetch = fetchMock

    await POST(makeReq({
      messages: [{ role: 'user', content: 'what is this?' }],
      images: ['base64data'],
    }))

    const sentBody = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(sentBody.model).toBe('gemma4:26b')
  })

  it('uses default model gemma4:26b when no images are attached', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, body: ndjsonStream(['ok']) })
    global.fetch = fetchMock

    await POST(makeReq({ messages: [{ role: 'user', content: 'hi' }] }))

    const sentBody = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(sentBody.model).toBe('gemma4:26b')
  })

  it('includes system prompt with task snapshot', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    mockFindMany.mockResolvedValue([
      { title: 'Overdue Task', category: null, completed: false, dueDate: yesterday },
    ] as never)
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, body: ndjsonStream(['ok']) })
    global.fetch = fetchMock

    await POST(makeReq({ messages: [{ role: 'user', content: 'hi' }] }))

    const sentBody = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    const systemPrompt = sentBody.messages[0].content as string
    expect(sentBody.messages[0].role).toBe('system')
    expect(systemPrompt).toContain('Alex')
    expect(systemPrompt).toContain('Overdue: 1')
    expect(systemPrompt).toContain('Overdue Task')
  })

  it('returns 502 when Ollama responds with a non-ok status', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      text: jest.fn().mockResolvedValue('model not found'),
    })

    const res = await POST(makeReq({ messages: [{ role: 'user', content: 'hi' }] }))

    expect(res.status).toBe(502)
  })

  it('returns 502 when Ollama is unreachable', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    global.fetch = jest.fn().mockRejectedValue(new Error('connection refused'))

    const res = await POST(makeReq({ messages: [{ role: 'user', content: 'hi' }] }))

    expect(res.status).toBe(502)
  })
})
