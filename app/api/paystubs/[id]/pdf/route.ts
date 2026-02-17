import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { PayStubPDFTemplate } from '@/components/paystubs/PayStubPDFTemplate'
import { hasActiveSubscription } from '@/lib/entitlements'

interface RouteContext {
  params: { id: string }
}

// POST /api/paystubs/[id]/pdf — Generate PDF
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  const supabase = createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get the pay stub
    const { data: paystub, error: fetchError } = await supabase
      .from('paystubs')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !paystub) {
      return NextResponse.json({ error: 'Pay stub not found' }, { status: 404 })
    }

    // Check if user has active subscription (for watermark)
    const hasSubscription = await hasActiveSubscription(user.id, supabase)
    const isWatermarked = !hasSubscription

    // Generate PDF using React PDF
    const pdfBuffer = await renderToBuffer(
      PayStubPDFTemplate({
        data: paystub,
        isWatermarked,
      })
    )

    // Upload to Supabase Storage
    const fileName = `${user.id}/${paystub.id}-${Date.now()}.pdf`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('PDF upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload PDF' }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName)

    // Update pay stub with PDF info
    await supabase
      .from('paystubs')
      .update({
        pdf_storage_path: fileName,
        pdf_generated_at: new Date().toISOString(),
        status: 'final',
      })
      .eq('id', params.id)
      .eq('user_id', user.id)

    return NextResponse.json({
      success: true,
      pdf_url: publicUrl,
      is_watermarked: isWatermarked,
    })
  } catch (error: any) {
    console.error('PDF generation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET /api/paystubs/[id]/pdf — Download existing PDF
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  const supabase = createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get the pay stub
    const { data: paystub, error: fetchError } = await supabase
      .from('paystubs')
      .select('pdf_storage_path')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !paystub || !paystub.pdf_storage_path) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(paystub.pdf_storage_path)

    return NextResponse.json({ pdf_url: publicUrl })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
