import { NextRequest } from 'next/server'
import { PATCH, DELETE } from '@/app/api/events/[id]/route'
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
    event: {
      findUnique: jest.fn(),
      update:     jest.fn(),
      delete:     jest.fn(),
    },
  },
}))

const mockGetSession = jest.mocked(auth.api.getSession)
const mockFindUnique = jest.mocked(prisma.event.findUnique)
const mockUpdate     = jest.mocked(prisma.event.update)
const mockDelete     = jest.mocked(prisma.event.delete)

const FAKE_SESSION = { user: { id: 'u1' } }

const FAKE_EVENT = {
  id: 'e1', title: 'Exam', details: null,
  startDate: '2026-12-01T09:00:00.000Z',
  dueDate: null, category: null,
  createdAt: new Date().toISOString(), userId: 'u1',
}

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) }
}

function makePatchReq(body: object) {
  return new NextRequest('http://localhost/api/events/e1', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function makeDeleteReq() {
  return new NextRequest('http://localhost/api/events/e1', { method: 'DELETE' })
}

beforeEach(() => jest.clearAllMocks())

// ── PATCH /api/events/[id] ─────────────────────────────────────────────────────

describe('PATCH /api/events/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null)

    const res = await PATCH(makePatchReq({ title: 'Updated' }), makeCtx('e1'))

    expect(res.status).toBe(401)
  })

  it('returns 404 when event does not exist', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockFindUnique.mockResolvedValue(null)

    const res = await PATCH(makePatchReq({ title: 'Updated' }), makeCtx('nonexistent'))

    expect(res.status).toBe(404)
  })

  it('returns 404 when event belongs to a different user', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockFindUnique.mockResolvedValue({ ...FAKE_EVENT, userId: 'other-user' } as never)

    const res = await PATCH(makePatchReq({ title: 'Updated' }), makeCtx('e1'))

    expect(res.status).toBe(404)
  })

  it('updates the event title and returns 200', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockFindUnique.mockResolvedValue(FAKE_EVENT as never)
    mockUpdate.mockResolvedValue({ ...FAKE_EVENT, title: 'Updated' } as never)

    const res = await PATCH(makePatchReq({ title: 'Updated' }), makeCtx('e1'))

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ title: 'Updated' })
  })

  it('updates the startDate and returns 200', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockFindUnique.mockResolvedValue(FAKE_EVENT as never)
    mockUpdate.mockResolvedValue({ ...FAKE_EVENT, startDate: '2026-12-02T09:00:00.000Z' } as never)

    const res = await PATCH(makePatchReq({ startDate: '2026-12-02T09:00:00.000Z' }), makeCtx('e1'))

    expect(res.status).toBe(200)
  })

  it('returns 400 when title is an empty string', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockFindUnique.mockResolvedValue(FAKE_EVENT as never)

    const res = await PATCH(makePatchReq({ title: '' }), makeCtx('e1'))

    expect(res.status).toBe(400)
  })

  it('returns 400 when startDate is not a valid datetime', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockFindUnique.mockResolvedValue(FAKE_EVENT as never)

    const res = await PATCH(makePatchReq({ startDate: 'not-a-date' }), makeCtx('e1'))

    expect(res.status).toBe(400)
  })
})

// ── DELETE /api/events/[id] ────────────────────────────────────────────────────

describe('DELETE /api/events/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null)

    const res = await DELETE(makeDeleteReq(), makeCtx('e1'))

    expect(res.status).toBe(401)
  })

  it('returns 404 when event does not exist', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockFindUnique.mockResolvedValue(null)

    const res = await DELETE(makeDeleteReq(), makeCtx('nonexistent'))

    expect(res.status).toBe(404)
  })

  it('returns 404 when event belongs to a different user', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockFindUnique.mockResolvedValue({ ...FAKE_EVENT, userId: 'other-user' } as never)

    const res = await DELETE(makeDeleteReq(), makeCtx('e1'))

    expect(res.status).toBe(404)
  })

  it('deletes the event and returns 204', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockFindUnique.mockResolvedValue(FAKE_EVENT as never)
    mockDelete.mockResolvedValue(FAKE_EVENT as never)

    const res = await DELETE(makeDeleteReq(), makeCtx('e1'))

    expect(res.status).toBe(204)
  })
})
