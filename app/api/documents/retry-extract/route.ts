import { NextRequest, NextResponse } from 'next/server'

// Simple wrapper around /api/extract so the UI has an explicit "retry" endpoint.
// Keeps auth/cookies behavior identical.
export async function POST(req: NextRequest) {
  try {
    const { documentId } = await req.json().catch(() => ({}))
    if (!documentId) return NextResponse.json({ error: 'Missing documentId' }, { status: 400 })

    const url = new URL(req.url)
    const extractUrl = new URL('/api/extract', url.origin)

    const res = await fetch(extractUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
      body: JSON.stringify({ documentId }),
      // Ensure this runs server-side (Node) and isn't cached
      cache: 'no-store',
    })

    const json = await res.json().catch(() => null)
    return NextResponse.json(json, { status: res.status })
  } catch (e) {
    console.error('retry-extract error', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
