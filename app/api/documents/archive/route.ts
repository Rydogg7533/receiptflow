import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  try {
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
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { documentId, archived } = body || {}
    if (!documentId) return NextResponse.json({ error: 'Missing documentId' }, { status: 400 })

    const patch = archived ? { archived_at: new Date().toISOString() } : { archived_at: null }

    const { error } = await supabase
      .from('documents')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', documentId)
      .eq('user_id', session.user.id)

    if (error) return NextResponse.json({ error: 'Database error' }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('archive route error', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
