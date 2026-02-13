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
    const { documentId, patch } = body || {}

    if (!documentId || !patch || typeof patch !== 'object') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const allowed: any = {}
    const allowKeys = ['document_type', 'payment_status', 'due_date', 'balance_due', 'needs_review', 'confidence_overall']
    for (const k of allowKeys) {
      if (k in patch) allowed[k] = patch[k]
    }

    const { error } = await supabase
      .from('documents')
      .update({ ...allowed, updated_at: new Date().toISOString() })
      .eq('id', documentId)
      .eq('user_id', session.user.id)

    if (error) {
      console.error('Document update error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Document update route error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
