import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/categories/route'
import { DELETE } from '@/app/api/categories/[id]/route'
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
    userCategory: {
      findMany:   jest.fn(),
      findUnique: jest.fn(),
      create:     jest.fn(),
      delete:     jest.fn(),
    },
    task: {
      updateMany: jest.fn(),
    },
  },
}))

const mockGetSession  = jest.mocked(auth.api.getSession)
const mockFindMany    = jest.mocked(prisma.userCategory.findMany)
const mockFindUnique  = jest.mocked(prisma.userCategory.findUnique)
const mockCreate      = jest.mocked(prisma.userCategory.create)
const mockDelete      = jest.mocked(prisma.userCategory.delete)
const mockUpdateMany  = jest.mocked(prisma.task.updateMany)

const FAKE_SESSION  = { user: { id: 'u1' } }
const FAKE_CATEGORY = { id: 'c1', name: 'Study', userId: 'u1', createdAt: new Date() }

function makePostReq(body: object) {
  return new NextRequest('http://localhost/api/categories', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function makeDeleteReq() {
  return new NextRequest('http://localhost/api/categories/c1', { method: 'DELETE' })
}

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => jest.clearAllMocks())

// ── GET /api/categories ────────────────────────────────────────────────────────

describe('GET /api/categories', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null)

    const res = await GET()

    expect(res.status).toBe(401)
  })

  it('returns the user\'s category list', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockFindMany.mockResolvedValue([FAKE_CATEGORY] as never)

    const res = await GET()

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].name).toBe('Study')
  })

  it('returns an empty array when user has no categories', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockFindMany.mockResolvedValue([] as never)

    const res = await GET()

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })
})

// ── POST /api/categories ───────────────────────────────────────────────────────

describe('POST /api/categories', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null)

    const res = await POST(makePostReq({ name: 'Study' }))

    expect(res.status).toBe(401)
  })

  it('creates a category and returns 201', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue(FAKE_CATEGORY as never)

    const res = await POST(makePostReq({ name: 'Study' }))

    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({ name: 'Study' })
  })

  it('returns 400 when name is missing', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)

    const res = await POST(makePostReq({}))

    expect(res.status).toBe(400)
  })

  it('returns 400 when name is an empty string', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)

    const res = await POST(makePostReq({ name: '' }))

    expect(res.status).toBe(400)
  })

  it('returns 400 when name exceeds 32 characters', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)

    const res = await POST(makePostReq({ name: 'a'.repeat(33) }))

    expect(res.status).toBe(400)
  })

  it('returns 409 when category name already exists for this user', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockFindUnique.mockResolvedValue(FAKE_CATEGORY as never)

    const res = await POST(makePostReq({ name: 'Study' }))

    expect(res.status).toBe(409)
  })
})

// ── DELETE /api/categories/[id] ───────────────────────────────────────────────

describe('DELETE /api/categories/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null)

    const res = await DELETE(makeDeleteReq(), makeCtx('c1'))

    expect(res.status).toBe(401)
  })

  it('returns 404 when category does not exist', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockFindUnique.mockResolvedValue(null)

    const res = await DELETE(makeDeleteReq(), makeCtx('nonexistent'))

    expect(res.status).toBe(404)
  })

  it('returns 404 when category belongs to a different user', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockFindUnique.mockResolvedValue({ ...FAKE_CATEGORY, userId: 'other-user' } as never)

    const res = await DELETE(makeDeleteReq(), makeCtx('c1'))

    expect(res.status).toBe(404)
  })

  it('deletes the category, clears it from tasks, and returns 204', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockFindUnique.mockResolvedValue(FAKE_CATEGORY as never)
    mockUpdateMany.mockResolvedValue({ count: 2 } as never)
    mockDelete.mockResolvedValue(FAKE_CATEGORY as never)

    const res = await DELETE(makeDeleteReq(), makeCtx('c1'))

    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { category: null } })
    )
    expect(res.status).toBe(204)
  })
})
