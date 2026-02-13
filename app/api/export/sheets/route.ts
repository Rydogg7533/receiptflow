import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { batchUpdateValues, createSpreadsheet, getValidAccessToken, type GoogleConnection } from '@/lib/google/sheets'

function safeNumber(v: any): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function flattenDocumentRow(doc: any): Record<string, any> {
  const ed = doc.extracted_data || {}
  return {
    document_id: doc.id,
    filename: doc.filename,
    file_type: doc.file_type,
    status: doc.status,
    uploaded_at: doc.created_at,

    document_type: doc.document_type ?? ed.document_type ?? '',
    payment_status: doc.payment_status ?? ed.payment_status ?? '',
    due_date: doc.due_date ?? ed.due_date ?? '',
    balance_due: doc.balance_due ?? ed.balance_due ?? '',

    vendor: ed.vendor ?? '',
    purchase_date: ed.date ?? '',
    currency: ed.currency ?? '',
    total: safeNumber(ed.total),
    subtotal: safeNumber(ed.subtotal),
    tax: safeNumber(ed.tax),
    tip: safeNumber(ed.tip),
    payment_method: ed.payment_method ?? '',
    receipt_number: ed.receipt_number ?? '',

    needs_review: doc.needs_review ?? ed.needs_review ?? '',
    confidence_overall: doc.confidence_overall ?? ed.confidence_overall ?? '',
  }
}

function flattenLineItemRows(doc: any): Record<string, any>[] {
  const ed = doc.extracted_data || {}
  const items = Array.isArray(ed.line_items) ? ed.line_items : []
  return items.map((item: any, idx: number) => ({
    document_id: doc.id,
    line_index: idx,
    description: item?.description ?? '',
    quantity: safeNumber(item?.quantity),
    unit_price: safeNumber(item?.price),
    line_total: safeNumber(item?.total),
  }))
}

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

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: conn, error: connErr } = await supabase
      .from('google_connections')
      .select('user_id, access_token, refresh_token, expires_at')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (connErr || !conn) {
      return NextResponse.json({ error: 'Google not connected' }, { status: 400 })
    }

    const connection = conn as GoogleConnection

    const accessToken = await getValidAccessToken(connection, async (patch) => {
      await supabase
        .from('google_connections')
        .update({
          ...(patch.access_token ? { access_token: patch.access_token } : {}),
          ...(patch.expires_at ? { expires_at: patch.expires_at } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', session.user.id)
    })

    const { data: documents, error: docErr } = await supabase
      .from('documents')
      .select('id, filename, file_type, status, extracted_data, created_at, document_type, payment_status, due_date, balance_due, needs_review, confidence_overall, exported_at, archived_at')
      .eq('user_id', session.user.id)
      .is('archived_at', null)
      .is('exported_at', null)
      .order('created_at', { ascending: false })

    if (docErr) return NextResponse.json({ error: 'Database error' }, { status: 500 })

    const docs = (documents || []).filter((d: any) => d.status === 'completed')

    // Create export batch
    const { data: batch, error: batchErr } = await supabase
      .from('export_batches')
      .insert({
        user_id: session.user.id,
        destination: 'sheets',
        doc_count: docs.length,
      })
      .select('*')
      .single()

    if (batchErr) {
      console.error('batch create error', batchErr)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const sheet = await createSpreadsheet(accessToken, `ReceiptFlow Export ${new Date().toISOString().slice(0, 10)} (Batch ${String(batch.id).slice(0, 8)})`)

    const docColumns = [
      'document_id',
      'filename',
      'file_type',
      'status',
      'uploaded_at',
      'document_type',
      'payment_status',
      'due_date',
      'balance_due',
      'vendor',
      'purchase_date',
      'currency',
      'total',
      'subtotal',
      'tax',
      'tip',
      'payment_method',
      'receipt_number',
      'needs_review',
      'confidence_overall',
    ]

    const docRows = docs.map(flattenDocumentRow)
    const docValues = [docColumns, ...docRows.map((r) => docColumns.map((c) => r[c] ?? ''))]

    const lineColumns = ['document_id', 'line_index', 'description', 'quantity', 'unit_price', 'line_total']
    const lineRows = docs.flatMap(flattenLineItemRows)
    const lineValues = [lineColumns, ...lineRows.map((r) => lineColumns.map((c) => r[c] ?? ''))]

    await batchUpdateValues(accessToken, sheet.spreadsheetId, [
      { range: 'Documents!A1', values: docValues },
      { range: 'Line Items!A1', values: lineValues },
    ])

    // Update batch with sheet info
    await supabase
      .from('export_batches')
      .update({ spreadsheet_id: sheet.spreadsheetId, spreadsheet_url: sheet.spreadsheetUrl })
      .eq('id', batch.id)
      .eq('user_id', session.user.id)

    // Mark exported (best-effort)
    if (docs.length > 0) {
      const now = new Date().toISOString()
      await supabase
        .from('documents')
        .update({ exported_at: now, export_batch_id: batch.id, updated_at: now })
        .in('id', docs.map((d: any) => d.id))
    }

    return NextResponse.json({ success: true, spreadsheetUrl: sheet.spreadsheetUrl, batchId: batch.id })
  } catch (e: any) {
    console.error('Sheets export error:', e)
    return NextResponse.json({ error: 'Export failed', details: e?.message || String(e) }, { status: 500 })
  }
}
