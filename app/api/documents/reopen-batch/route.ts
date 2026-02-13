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
    const { batchId } = body || {}
    if (!batchId) return NextResponse.json({ error: 'Missing batchId' }, { status: 400 })

    const now = new Date().toISOString()

    // Re-open batch for export: unarchive + clear exported_at (sheet remains)
    // Count total docs in batch + how many are currently trashed
    const { count: totalCount, error: totalErr } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('export_batch_id', batchId)

    if (totalErr) {
      console.error('reopen-batch count error', totalErr)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const { count: trashedCount, error: trashedErr } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('export_batch_id', batchId)
      .not('trashed_at', 'is', null)

    if (trashedErr) {
      console.error('reopen-batch trashed count error', trashedErr)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const { error, data: reopenedRows } = await supabase
      .from('documents')
      .update({ archived_at: null, exported_at: null, updated_at: now })
      .eq('user_id', session.user.id)
      .eq('export_batch_id', batchId)
      .is('trashed_at', null)
      .select('*')

    if (error) {
      console.error('reopen-batch error', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const skippedTrashedCount = trashedCount ?? 0
    const reopenedCount = reopenedRows?.length ?? 0

    return NextResponse.json({
      success: true,
      batchId,
      totalCount: totalCount ?? 0,
      reopenedCount,
      skippedTrashedCount,
      message:
        skippedTrashedCount > 0
          ? `Re-opened ${reopenedCount} document(s). ${skippedTrashedCount} still in Trash.`
          : `Re-opened ${reopenedCount} document(s).`,
    })
  } catch (e) {
    console.error('reopen-batch route error', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
