import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/tasks/route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/auth', () => ({
  auth: { api: { getSession: jest.fn() } },
}))
jest.mock('next/headers', () => ({
  headers: jest.fn().mockResolvedValue(new Headers()),
}))
jest.mock('@/lib/prisma', () => ({
  prisma: { task: { findMany: jest.fn(), create: jest.fn() } },
}))

const mockGetSession = jest.mocked(auth.api.getSession)
const mockFindMany   = jest.mocked(prisma.task.findMany)
const mockCreate     = jest.mocked(prisma.task.create)

const FAKE_SESSION = { user: { id: 'u1', name: 'Test' } }

const FAKE_TASK = {
  id: 't1', title: 'Study math', details: null, priority: 2,
  dueDate: null, category: null, completed: false,
  createdAt: new Date().toISOString(), userId: 'u1',
}

function makeGetReq(params?: Record<string, string>) {
  const url = new URL('http://localhost/api/tasks')
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url)
}

function makePostReq(body: object) {
  return new NextRequest('http://localhost/api/tasks', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ── GET /api/tasks ─────────────────────────────────────────────────────────────

describe('GET /api/tasks', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null)

    const res = await GET(makeGetReq())

    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ error: 'Unauthorized' })
  })

  it('returns the user\'s task list', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockFindMany.mockResolvedValue([FAKE_TASK] as never)

    const res = await GET(makeGetReq())

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].title).toBe('Study math')
  })

  it('filters by category when query param is provided', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockFindMany.mockResolvedValue([] as never)

    await GET(makeGetReq({ category: 'EXAM' }))

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ category: 'EXAM' }),
      })
    )
  })

  it('returns empty array when user has no tasks', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockFindMany.mockResolvedValue([] as never)

    const res = await GET(makeGetReq())

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })
})

// ── POST /api/tasks ────────────────────────────────────────────────────────────

describe('POST /api/tasks', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null)

    const res = await POST(makePostReq({ title: 'Buy groceries' }))

    expect(res.status).toBe(401)
  })

  it('creates a task and returns 201', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockCreate.mockResolvedValue(FAKE_TASK as never)

    const res = await POST(makePostReq({ title: 'Study math', priority: 2 }))

    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({ title: 'Study math' })
  })

  it('returns 400 when title is missing', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)

    const res = await POST(makePostReq({ priority: 3 }))

    expect(res.status).toBe(400)
  })

  it('returns 400 when title is an empty string', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)

    const res = await POST(makePostReq({ title: '' }))

    expect(res.status).toBe(400)
  })

  it('returns 400 when priority is out of range (0)', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)

    const res = await POST(makePostReq({ title: 'Task', priority: 0 }))

    expect(res.status).toBe(400)
  })

  it('returns 400 when priority is out of range (6)', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)

    const res = await POST(makePostReq({ title: 'Task', priority: 6 }))

    expect(res.status).toBe(400)
  })

  it('returns 400 when dueDate is not a valid datetime string', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)

    const res = await POST(makePostReq({ title: 'Task', dueDate: 'not-a-date' }))

    expect(res.status).toBe(400)
  })

  it('accepts a task with all optional fields', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockCreate.mockResolvedValue({ ...FAKE_TASK, details: 'Some notes', priority: 5 } as never)

    const res = await POST(makePostReq({
      title: 'Study math',
      details: 'Some notes',
      priority: 5,
      dueDate: '2026-12-31T23:59:59.000Z',
      category: 'EXAM',
    }))

    expect(res.status).toBe(201)
  })
})
