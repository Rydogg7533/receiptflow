import { SupabaseClient } from '@supabase/supabase-js'

export interface ToolAccess {
  canAccess: boolean
  isFree: boolean
  remainingFree?: number
  reason?: string
}

export async function canAccessTool(
  userId: string,
  toolSlug: string,
  supabase: SupabaseClient
): Promise<ToolAccess> {
  try {
    // Check 1: Get user's profile and subscription status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_status, stripe_price_id')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return {
        canAccess: false,
        isFree: false,
        reason: 'Profile not found',
      }
    }

    // Check 2: Active subscription with bundle plan?
    if (
      profile.subscription_status === 'active' &&
      profile.stripe_price_id === process.env.NEXT_PUBLIC_STRIPE_PRICE_BUNDLE
    ) {
      return {
        canAccess: true,
        isFree: false,
      }
    }

    // Check 3: Single tool subscriber — check tool_access table
    if (profile.subscription_status === 'active') {
      const { data: access } = await supabase
        .from('tool_access')
        .select('is_active')
        .eq('user_id', userId)
        .eq('tool_slug', toolSlug)
        .maybeSingle()

      if (access?.is_active === true) {
        return {
          canAccess: true,
          isFree: false,
        }
      }
    }

    // Check 4: Free tier (tool-specific limits)
    const freeTierLimit = getFreeTierLimit(toolSlug)
    
    if (freeTierLimit > 0) {
      const { count } = await supabase
        .from(getToolTableName(toolSlug))
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      const remaining = freeTierLimit - (count || 0)

      if (remaining > 0) {
        return {
          canAccess: true,
          isFree: true,
          remainingFree: remaining,
        }
      }

      return {
        canAccess: false,
        isFree: true,
        remainingFree: 0,
        reason: 'Free tier limit reached. Please subscribe to continue.',
      }
    }

    // No access
    return {
      canAccess: false,
      isFree: false,
      reason: 'No active subscription or tool access',
    }
  } catch (error) {
    console.error('Error checking tool access:', error)
    return {
      canAccess: false,
      isFree: false,
      reason: 'Error checking access',
    }
  }
}

function getFreeTierLimit(toolSlug: string): number {
  const limits: Record<string, number> = {
    receipts: 0, // No free tier for receipts
    paystubs: 1, // 1 watermarked pay stub
    invoices: 3, // Future: 3 invoices
    expenses: 0, // No free tier
  }
  
  return limits[toolSlug] || 0
}

function getToolTableName(toolSlug: string): string {
  const tables: Record<string, string> = {
    receipts: 'documents',
    paystubs: 'paystubs',
    invoices: 'invoices',
    expenses: 'expenses',
  }
  
  return tables[toolSlug] || toolSlug
}

export async function hasActiveSubscription(
  userId: string,
  supabase: SupabaseClient
): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', userId)
    .single()

  return profile?.subscription_status === 'active'
}
