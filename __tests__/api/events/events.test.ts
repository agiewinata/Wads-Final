import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/events/route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/auth', () => ({
  auth: { api: { getSession: jest.fn() } },
}))
jest.mock('next/headers', () => ({
  headers: jest.fn().mockResolvedValue(new Headers()),
}))
jest.mock('@/lib/prisma', () => ({
  prisma: { event: { findMany: jest.fn(), create: jest.fn() } },
}))

const mockGetSession = jest.mocked(auth.api.getSession)
const mockFindMany   = jest.mocked(prisma.event.findMany)
const mockCreate     = jest.mocked(prisma.event.create)

const FAKE_SESSION = { user: { id: 'u1' } }

const FAKE_EVENT = {
  id: 'e1', title: 'Exam', details: null,
  startDate: '2026-12-01T09:00:00.000Z',
  dueDate: null, category: null,
  createdAt: new Date().toISOString(), userId: 'u1',
}

function makePostReq(body: object) {
  return new NextRequest('http://localhost/api/events', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => jest.clearAllMocks())

// ── GET /api/events ────────────────────────────────────────────────────────────

describe('GET /api/events', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null)

    const res = await GET()

    expect(res.status).toBe(401)
  })

  it("returns the user's event list", async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockFindMany.mockResolvedValue([FAKE_EVENT] as never)

    const res = await GET()

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].title).toBe('Exam')
  })

  it('returns an empty array when user has no events', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockFindMany.mockResolvedValue([] as never)

    const res = await GET()

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })
})

// ── POST /api/events ───────────────────────────────────────────────────────────

describe('POST /api/events', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null)

    const res = await POST(makePostReq({ title: 'Exam', startDate: '2026-12-01T09:00:00.000Z' }))

    expect(res.status).toBe(401)
  })

  it('creates an event and returns 201', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockCreate.mockResolvedValue(FAKE_EVENT as never)

    const res = await POST(makePostReq({ title: 'Exam', startDate: '2026-12-01T09:00:00.000Z' }))

    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({ title: 'Exam' })
  })

  it('returns 400 when title is missing', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)

    const res = await POST(makePostReq({ startDate: '2026-12-01T09:00:00.000Z' }))

    expect(res.status).toBe(400)
  })

  it('returns 400 when title is an empty string', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)

    const res = await POST(makePostReq({ title: '', startDate: '2026-12-01T09:00:00.000Z' }))

    expect(res.status).toBe(400)
  })

  it('returns 400 when startDate is missing', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)

    const res = await POST(makePostReq({ title: 'Exam' }))

    expect(res.status).toBe(400)
  })

  it('returns 400 when startDate is not a valid datetime', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)

    const res = await POST(makePostReq({ title: 'Exam', startDate: 'not-a-date' }))

    expect(res.status).toBe(400)
  })

  it('returns 400 when dueDate is not a valid datetime', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)

    const res = await POST(makePostReq({ title: 'Exam', startDate: '2026-12-01T09:00:00.000Z', dueDate: 'bad' }))

    expect(res.status).toBe(400)
  })

  it('accepts an event with all optional fields', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockCreate.mockResolvedValue({
      ...FAKE_EVENT, details: 'Room 301', dueDate: '2026-12-01T12:00:00.000Z', category: 'EXAM',
    } as never)

    const res = await POST(makePostReq({
      title: 'Exam',
      startDate: '2026-12-01T09:00:00.000Z',
      dueDate: '2026-12-01T12:00:00.000Z',
      details: 'Room 301',
      category: 'EXAM',
    }))

    expect(res.status).toBe(201)
  })
})
