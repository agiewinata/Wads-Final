import { POST } from '@/app/api/ai/recommendations/route'
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

function ollamaJson(data: object) {
  return jest.fn().mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue({ message: { content: JSON.stringify(data) } }),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockFindMany.mockResolvedValue([])
})

describe('POST /api/ai/recommendations', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null)

    const res = await POST()

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns the recommendations array from Ollama', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    global.fetch = ollamaJson({ recommendations: ['Tip A', 'Tip B', 'Tip C'] })

    const res = await POST()

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.recommendations).toEqual(['Tip A', 'Tip B', 'Tip C'])
  })

  it('returns fallback recommendations when Ollama response has no recommendations key', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    global.fetch = ollamaJson({})

    const res = await POST()

    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.recommendations.length).toBeGreaterThan(0)
  })

  it('sends task stats and student name in the prompt', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    mockFindMany.mockResolvedValue([
      { title: 'Late Report', category: null, completed: false, dueDate: yesterday, priority: 5 },
      { title: 'Done Task', category: null, completed: true, dueDate: null, priority: 1 },
    ] as never)
    const fetchMock = ollamaJson({ recommendations: ['Go!'] })
    global.fetch = fetchMock

    await POST()

    const sentBody = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    const prompt = sentBody.messages[0].content as string
    expect(prompt).toContain('Alex')
    expect(prompt).toContain('"Late Report"')
    expect(prompt).toContain('Completion rate: 50%')
  })

  it('returns fallback recommendations when Ollama is unreachable', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    global.fetch = jest.fn().mockRejectedValue(new Error('network error'))

    const res = await POST()

    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.recommendations.length).toBeGreaterThan(0)
  })

  it('returns fallback recommendations when Ollama responds with a non-ok status', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      text: jest.fn().mockResolvedValue('bad gateway'),
    })

    const res = await POST()

    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.recommendations.length).toBeGreaterThan(0)
  })
})
