import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST() {
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

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Delete only trash items for this user.
    const { error, count } = await supabase
      .from('documents')
      .delete({ count: 'exact' })
      .eq('user_id', session.user.id)
      .eq('status', 'trash')

    if (error) return NextResponse.json({ error: 'Database error' }, { status: 500 })

    return NextResponse.json({ success: true, deleted: count ?? null })
  } catch (e) {
    console.error('empty-trash route error', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
