import { NextRequest } from 'next/server'
import { POST } from '@/app/api/ai/upload/route'
import { auth } from '@/lib/auth'

jest.mock('@/lib/auth', () => ({
  auth: { api: { getSession: jest.fn() } },
}))
jest.mock('next/headers', () => ({
  headers: jest.fn().mockResolvedValue(new Headers()),
}))
jest.mock('pdf-parse', () => jest.fn())

const mockGetSession = jest.mocked(auth.api.getSession)
const mockPdfParse = require('pdf-parse') as jest.Mock

const FAKE_SESSION = { user: { id: 'u1', name: 'Alex' } }

function makeReq(formData: FormData) {
  return new NextRequest('http://localhost/api/ai/upload', {
    method: 'POST',
    body: formData,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('POST /api/ai/upload', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null)

    const fd = new FormData()
    const res = await POST(makeReq(fd))

    expect(res.status).toBe(401)
  })

  it('returns 400 when no file is provided', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)

    const fd = new FormData()
    const res = await POST(makeReq(fd))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('No file')
  })

  it('returns 400 when file exceeds 10 MB', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)

    const bigContent = 'x'.repeat(11 * 1024 * 1024)
    const fd = new FormData()
    fd.append('file', new File([bigContent], 'big.txt', { type: 'text/plain' }))
    const res = await POST(makeReq(fd))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('too large')
  })

  it('returns { text, name } for a plain text file', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)

    const fd = new FormData()
    fd.append('file', new File(['Hello world'], 'notes.txt', { type: 'text/plain' }))
    const res = await POST(makeReq(fd))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.text).toBe('Hello world')
    expect(body.name).toBe('notes.txt')
  })

  it('truncates text files longer than 20 000 characters', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)

    const longText = 'a'.repeat(25_000)
    const fd = new FormData()
    fd.append('file', new File([longText], 'long.txt', { type: 'text/plain' }))
    const res = await POST(makeReq(fd))

    const body = await res.json()
    expect(body.text.length).toBe(20_000)
  })

  it('parses a PDF file and returns extracted text', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockPdfParse.mockResolvedValue({ text: 'Extracted PDF text' })

    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]) // %PDF magic bytes
    const fd = new FormData()
    fd.append('file', new File([pdfBytes], 'doc.pdf', { type: 'application/pdf' }))
    const res = await POST(makeReq(fd))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.text).toBe('Extracted PDF text')
    expect(body.name).toBe('doc.pdf')
  })

  it('truncates PDF text longer than 20 000 characters', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockPdfParse.mockResolvedValue({ text: 'b'.repeat(25_000) })

    const fd = new FormData()
    fd.append('file', new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'big.pdf', { type: 'application/pdf' }))
    const res = await POST(makeReq(fd))

    const body = await res.json()
    expect(body.text.length).toBe(20_000)
  })

  it('returns 422 when pdf-parse throws', async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION as never)
    mockPdfParse.mockRejectedValue(new Error('corrupted PDF'))

    const fd = new FormData()
    fd.append('file', new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'bad.pdf', { type: 'application/pdf' }))
    const res = await POST(makeReq(fd))

    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toContain('parse')
  })
})
