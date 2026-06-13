import { NextRequest } from 'next/server'
import { POST } from '@/app/api/ai/assess/route'
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

const FAKE_SESSION = { user: { id: 'u1', name: 'Sam' } }

const now = new Date()
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

function task(overrides: Record<string, unknown> = {}) {
  return { title: 'Task', category: null, completed: false, dueDate: null, ...overrides }
}

function ollamaJson(data: object) {
  return jest.fn().mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue({ message: { content: JSON.stringify(data) } }),
  })
}

function makeReq(type: string) {
  return new NextRequest('http://localhost/api/ai/assess', {
    method: 'POST',
    body: JSON.stringify({ type }),
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockFindMany.mockResolvedValue([])
})

describe('POST /api/ai/assess', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null)

    const res = await POST(makeReq('burnout'))

    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('Unauthorized')
  })

  describe('burnout type', () => {
    it('returns { show, message } as Ollama responds when show=true', async () => {
      mockGetSession.mockResolvedValue(FAKE_SESSION as never)
      mockFindMany.mockResolvedValue([
        task({ title: 'A', dueDate: yesterday }),
        task({ title: 'B', dueDate: yesterday }),
        task({ title: 'C', dueDate: yesterday }),
      ] as never)
      global.fetch = ollamaJson({ show: true, message: 'You have 3 overdue tasks, Sam!' })

      const res = await POST(makeReq('burnout'))

      const body = await res.json()
      expect(body.show).toBe(true)
      expect(body.message).toBe('You have 3 overdue tasks, Sam!')
    })

    it('returns { show: false, message: "" } when Ollama says no warning needed', async () => {
      mockGetSession.mockResolvedValue(FAKE_SESSION as never)
      mockFindMany.mockResolvedValue([task(), task()] as never)
      global.fetch = ollamaJson({ show: false, message: '' })

      const res = await POST(makeReq('burnout'))

      const body = await res.json()
      expect(body.show).toBe(false)
      expect(body.message).toBe('')
    })

    it('includes overdue task names in the prompt', async () => {
      mockGetSession.mockResolvedValue(FAKE_SESSION as never)
      mockFindMany.mockResolvedValue([
        task({ title: 'Essay Draft', dueDate: yesterday }),
        task({ title: 'Lab Report', dueDate: yesterday }),
        task({ title: 'Quiz Prep', dueDate: yesterday }),
      ] as never)
      const fetchMock = ollamaJson({ show: true, message: 'Warning' })
      global.fetch = fetchMock

      await POST(makeReq('burnout'))

      const sentBody = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
      const prompt = sentBody.messages[0].content as string
      expect(prompt).toContain('"Essay Draft"')
      expect(prompt).toContain('"Lab Report"')
      expect(prompt).toContain('Overdue (3)')
    })

    it('includes all burnout threshold rules in the prompt', async () => {
      mockGetSession.mockResolvedValue(FAKE_SESSION as never)
      const fetchMock = ollamaJson({ show: false, message: '' })
      global.fetch = fetchMock

      await POST(makeReq('burnout'))

      const sentBody = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
      const prompt = sentBody.messages[0].content as string
      expect(prompt).toContain('overdue tasks >= 3')
      expect(prompt).toContain('active tasks >= 8')
      expect(prompt).toContain('overdue >= 1 AND dueSoon >= 3')
    })

    it('defaults show=false and message="" when Ollama returns unexpected JSON', async () => {
      mockGetSession.mockResolvedValue(FAKE_SESSION as never)
      global.fetch = ollamaJson({})

      const res = await POST(makeReq('burnout'))

      const body = await res.json()
      expect(body.show).toBe(false)
      expect(body.message).toBe('')
    })
  })

  describe('affirmation type', () => {
    it('returns { message } from Ollama response', async () => {
      mockGetSession.mockResolvedValue(FAKE_SESSION as never)
      global.fetch = ollamaJson({ message: 'You are crushing it, Sam!' })

      const res = await POST(makeReq('affirmation'))

      const body = await res.json()
      expect(body.message).toBe('You are crushing it, Sam!')
    })

    it('includes student name in the affirmation prompt', async () => {
      mockGetSession.mockResolvedValue(FAKE_SESSION as never)
      const fetchMock = ollamaJson({ message: 'Great job!' })
      global.fetch = fetchMock

      await POST(makeReq('affirmation'))

      const sentBody = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
      const prompt = sentBody.messages[0].content as string
      expect(prompt).toContain('Sam')
      expect(prompt).toContain('affirmation')
    })

    it('includes active task count in the affirmation prompt', async () => {
      mockGetSession.mockResolvedValue(FAKE_SESSION as never)
      mockFindMany.mockResolvedValue([
        task({ title: 'Active 1' }),
        task({ title: 'Active 2' }),
        task({ title: 'Done', completed: true }),
      ] as never)
      const fetchMock = ollamaJson({ message: 'Go Sam!' })
      global.fetch = fetchMock

      await POST(makeReq('affirmation'))

      const sentBody = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
      const prompt = sentBody.messages[0].content as string
      expect(prompt).toContain('Active tasks: 2')
      expect(prompt).toContain('Completed: 1')
    })
  })

  describe('error handling', () => {
    it('returns 502 when Ollama is unreachable', async () => {
      mockGetSession.mockResolvedValue(FAKE_SESSION as never)
      global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'))

      const res = await POST(makeReq('burnout'))

      expect(res.status).toBe(502)
    })

    it('returns 502 when Ollama responds with a non-ok status', async () => {
      mockGetSession.mockResolvedValue(FAKE_SESSION as never)
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        text: jest.fn().mockResolvedValue('error'),
      })

      const res = await POST(makeReq('affirmation'))

      expect(res.status).toBe(502)
    })
  })
})
