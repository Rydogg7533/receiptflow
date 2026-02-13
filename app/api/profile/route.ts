import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
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
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('subscription_status, stripe_customer_id, stripe_subscription_id, current_period_end')
      .eq('id', session.user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Profile fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    return NextResponse.json({ 
      profile: profile || { 
        subscription_status: 'inactive',
        stripe_customer_id: null,
        stripe_subscription_id: null,
        current_period_end: null,
      }
    })

  } catch (error) {
    console.error('Profile error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
