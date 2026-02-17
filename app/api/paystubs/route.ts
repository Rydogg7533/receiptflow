import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { canAccessTool } from '@/lib/entitlements'

// GET /api/paystubs — List user's pay stubs
export async function GET(request: NextRequest) {
  const supabase = createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get query params for filtering
  const searchParams = request.nextUrl.searchParams
  const employeeFilter = searchParams.get('employee')
  const yearFilter = searchParams.get('year')

  let query = supabase
    .from('paystubs')
    .select('*')
    .eq('user_id', user.id)
    .order('pay_date', { ascending: false })

  if (employeeFilter) {
    query = query.ilike('employee_name', `%${employeeFilter}%`)
  }

  if (yearFilter) {
    query = query
      .gte('pay_date', `${yearFilter}-01-01`)
      .lte('pay_date', `${yearFilter}-12-31`)
  }

  const { data: paystubs, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ paystubs })
}

// POST /api/paystubs — Create a new pay stub
export async function POST(request: NextRequest) {
  const supabase = createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check tool access
  const access = await canAccessTool(user.id, 'paystubs', supabase)
  
  if (!access.canAccess) {
    return NextResponse.json({ 
      error: access.reason || 'Access denied',
      isFree: access.isFree,
      remainingFree: access.remainingFree,
    }, { status: 403 })
  }

  try {
    const body = await request.json()

    // Validate required fields
    const requiredFields = [
      'company_name',
      'employee_name',
      'pay_period_start',
      'pay_period_end',
      'pay_date',
      'pay_frequency',
      'earnings',
    ]

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Calculate totals
    const gross_pay = body.earnings.reduce(
      (sum: number, e: any) => sum + Number(e.amount || 0),
      0
    )
    
    const total_deductions = (body.deductions || []).reduce(
      (sum: number, d: any) => sum + Number(d.amount || 0),
      0
    )
    
    const net_pay = gross_pay - total_deductions

    // Calculate YTD values
    const year = new Date(body.pay_date).getFullYear()
    const ytd = await calculateYTD(
      user.id,
      body.employee_name,
      year,
      supabase
    )

    // If contact_id not provided but employee_name is new, create contact
    let contact_id = body.contact_id

    if (!contact_id && body.employee_name) {
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', body.employee_name)
        .eq('type', 'employee')
        .maybeSingle()

      if (existingContact) {
        contact_id = existingContact.id
      } else {
        // Create new employee contact
        const { data: newContact, error: contactError } = await supabase
          .from('contacts')
          .insert({
            user_id: user.id,
            name: body.employee_name,
            type: 'employee',
            address_line1: body.employee_address || null,
          })
          .select('id')
          .single()

        if (!contactError && newContact) {
          contact_id = newContact.id
        }
      }
    }

    // Insert pay stub
    const { data: paystub, error } = await supabase
      .from('paystubs')
      .insert({
        user_id: user.id,
        contact_id,
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
        status: body.status || 'draft',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      paystub,
      isFree: access.isFree,
    }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
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
