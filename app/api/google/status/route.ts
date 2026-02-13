import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = cookies()
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
  if (!session) return NextResponse.json({ connected: false }, { status: 200 })

  const { data, error } = await supabase
    .from('google_connections')
    .select('user_id, expires_at')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (error) {
    console.error('google status error', error)
    return NextResponse.json({ connected: false }, { status: 200 })
  }

  return NextResponse.json({ connected: !!data, expires_at: data?.expires_at ?? null })
}
