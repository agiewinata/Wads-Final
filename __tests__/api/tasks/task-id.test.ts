import { NextRequest } from 'next/server'
import { PATCH, DELETE } from '@/app/api/tasks/[id]/route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/auth', () => ({
  auth: { api: { getSession: jest.fn() } },
}))
jest.mock('next/headers', () => ({
  headers: jest.fn().mockResolvedValue(new Headers()),
}))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    task: {
      findUnique: jest.fn(),
      update:     jest.fn(),
      delete:     jest.fn(),
    },
  },
}))

const mockGetSession  = jest.mocked(auth.api.getSession)
const mockFindUnique  = jest.mocked(prisma.task.findUnique)
const mockUpdate      = jest.mocked(prisma.task.update)
const mockDelete      = jest.mocked(prisma.task.delete)

const FAKE_SESSION = { user: { id: 'u1' } }

const FAKE_TASK = {
  id: 't1', title: 'Old title', details: null, priority: 1,
  dueDate: null, category: null, completed: false,
  createdAt: new Date().toISOString(), userId: 'u1',
}

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) }
}

function makePatchReq(body: object) {
  return new NextRequest('http://localhost/api/tasks/t1', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function makeDeleteReq() {
  return new NextRequest('http://localhost/api/tasks/t1', { method: 'DELETE' })
}

beforeEach(() => jest.clearAllMocks())

// ── PATCH /api/tasks/[id] ──────────────────────────────────────────────────────

describe('PATCH /api/tasks/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null)

    const res = await PATCH(makePatchReq({ title: 'New' }), makeCtx('t1'))

    expect(res.status).toBe(401)
  })

  it('returns 404 when task does not exist', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockFindUnique.mockResolvedValue(null)

    const res = await PATCH(makePatchReq({ title: 'New' }), makeCtx('nonexistent'))

    expect(res.status).toBe(404)
  })

  it('returns 404 when task belongs to a different user', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockFindUnique.mockResolvedValue({ ...FAKE_TASK, userId: 'other-user' } as never)

    const res = await PATCH(makePatchReq({ title: 'New' }), makeCtx('t1'))

    expect(res.status).toBe(404)
  })

  it('updates the task and returns 200', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockFindUnique.mockResolvedValue(FAKE_TASK as never)
    mockUpdate.mockResolvedValue({ ...FAKE_TASK, title: 'New title' } as never)

    const res = await PATCH(makePatchReq({ title: 'New title' }), makeCtx('t1'))

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ title: 'New title' })
  })

  it('marks a task as completed', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockFindUnique.mockResolvedValue(FAKE_TASK as never)
    mockUpdate.mockResolvedValue({ ...FAKE_TASK, completed: true } as never)

    const res = await PATCH(makePatchReq({ completed: true }), makeCtx('t1'))

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ completed: true })
  })

  it('returns 400 when priority is invalid', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockFindUnique.mockResolvedValue(FAKE_TASK as never)

    const res = await PATCH(makePatchReq({ priority: 99 }), makeCtx('t1'))

    expect(res.status).toBe(400)
  })
})

// ── DELETE /api/tasks/[id] ─────────────────────────────────────────────────────

describe('DELETE /api/tasks/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null)

    const res = await DELETE(makeDeleteReq(), makeCtx('t1'))

    expect(res.status).toBe(401)
  })

  it('returns 404 when task does not exist', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockFindUnique.mockResolvedValue(null)

    const res = await DELETE(makeDeleteReq(), makeCtx('nonexistent'))

    expect(res.status).toBe(404)
  })

  it('returns 404 when task belongs to a different user', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockFindUnique.mockResolvedValue({ ...FAKE_TASK, userId: 'other-user' } as never)

    const res = await DELETE(makeDeleteReq(), makeCtx('t1'))

    expect(res.status).toBe(404)
  })

  it('deletes the task and returns 204', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockFindUnique.mockResolvedValue(FAKE_TASK as never)
    mockDelete.mockResolvedValue(FAKE_TASK as never)

    const res = await DELETE(makeDeleteReq(), makeCtx('t1'))

    expect(res.status).toBe(204)
  })
})
