import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { exchangeCodeForTokens, getBaseUrlFromRequest } from '@/lib/google/oauth'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  const cookieStore = cookies()
  const expectedState = cookieStore.get('google_oauth_state')?.value

  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 })
  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.json({ error: 'Invalid state' }, { status: 400 })
  }

  // Clear state cookie
  cookieStore.set({ name: 'google_oauth_state', value: '', path: '/', maxAge: 0 })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tokens = await exchangeCodeForTokens(req, code)

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  const { error } = await supabase
    .from('google_connections')
    .upsert({
      user_id: session.user.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expires_at: expiresAt,
      scope: tokens.scope ?? null,
      token_type: tokens.token_type,
      updated_at: new Date().toISOString(),
    })

  if (error) {
    console.error('Failed to store Google tokens:', error)
    return NextResponse.json({ error: 'Failed to store tokens' }, { status: 500 })
  }

  const base = getBaseUrlFromRequest(req)
  return NextResponse.redirect(`${base}/?google=connected`)
}
