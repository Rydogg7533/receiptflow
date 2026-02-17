import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteContext {
  params: { id: string }
}

// GET /api/paystubs/[id] — Get single pay stub
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  const supabase = createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: paystub, error } = await supabase
    .from('paystubs')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !paystub) {
    return NextResponse.json({ error: 'Pay stub not found' }, { status: 404 })
  }

  return NextResponse.json({ paystub })
}

// PUT /api/paystubs/[id] — Update pay stub
export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  const supabase = createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check ownership
    const { data: existing, error: fetchError } = await supabase
      .from('paystubs')
      .select('status')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Pay stub not found' }, { status: 404 })
    }

    // Only allow updates to drafts
    if (existing.status !== 'draft') {
      return NextResponse.json(
        { error: 'Cannot update finalized pay stubs' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Recalculate totals
    const gross_pay = body.earnings.reduce(
      (sum: number, e: any) => sum + Number(e.amount || 0),
      0
    )
    
    const total_deductions = (body.deductions || []).reduce(
      (sum: number, d: any) => sum + Number(d.amount || 0),
      0
    )
    
    const net_pay = gross_pay - total_deductions

    // Recalculate YTD
    const year = new Date(body.pay_date).getFullYear()
    const ytd = await calculateYTD(
      user.id,
      body.employee_name,
      year,
      supabase
    )

    const { data: paystub, error } = await supabase
      .from('paystubs')
      .update({
        company_name: body.company_name,
        company_address: body.company_address || null,
        company_phone: body.company_phone || null,
        company_ein: body.company_ein || null,
        company_logo_url: body.company_logo_url || null,
        employee_name: body.employee_name,
        employee_address: body.employee_address || null,
        employee_id_number: body.employee_id_number || null,
        ssn_last_four: body.ssn_last_four || null,
        pay_method: body.pay_method || 'direct_deposit',
        pay_period_start: body.pay_period_start,
        pay_period_end: body.pay_period_end,
        pay_date: body.pay_date,
        pay_frequency: body.pay_frequency,
        earnings: body.earnings,
        deductions: body.deductions || [],
        gross_pay,
        total_deductions,
        net_pay,
        ytd_gross: ytd.ytd_gross + gross_pay,
        ytd_deductions: ytd.ytd_deductions + total_deductions,
        ytd_net: ytd.ytd_net + net_pay,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ paystub })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/paystubs/[id] — Delete pay stub
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  const supabase = createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get the pay stub to check for PDF
  const { data: paystub } = await supabase
    .from('paystubs')
    .select('pdf_storage_path')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!paystub) {
    return NextResponse.json({ error: 'Pay stub not found' }, { status: 404 })
  }

  // Delete PDF from storage if exists
  if (paystub.pdf_storage_path) {
    try {
      await supabase.storage
        .from('documents')
        .remove([paystub.pdf_storage_path])
    } catch (error) {
      console.error('Error deleting PDF from storage:', error)
      // Continue with deletion even if PDF removal fails
    }
  }

  // Delete the pay stub record
  const { error } = await supabase
    .from('paystubs')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// Helper: Calculate YTD values
async function calculateYTD(
  userId: string,
  employeeName: string,
  year: number,
  supabase: any
) {
  const { data: existingStubs } = await supabase
    .from('paystubs')
    .select('gross_pay, total_deductions, net_pay')
    .eq('user_id', userId)
    .eq('employee_name', employeeName)
    .gte('pay_date', `${year}-01-01`)
    .lte('pay_date', `${year}-12-31`)
    .eq('status', 'final')

  const ytd_gross = (existingStubs || []).reduce(
    (sum: number, s: any) => sum + Number(s.gross_pay),
    0
  )
  const ytd_deductions = (existingStubs || []).reduce(
    (sum: number, s: any) => sum + Number(s.total_deductions),
    0
  )
  const ytd_net = (existingStubs || []).reduce(
    (sum: number, s: any) => sum + Number(s.net_pay),
    0
  )

  return { ytd_gross, ytd_deductions, ytd_net }
}
