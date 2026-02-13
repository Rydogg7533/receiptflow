'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from './SupabaseProvider'
import { CreditCard, Loader2, CheckCircle } from 'lucide-react'

interface SubscriptionData {
  subscription_status: string
  current_period_end: string
  stripe_subscription_id: string | null
}

export function SubscriptionStatus() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [managingBilling, setManagingBilling] = useState(false)
  const { user } = useSupabase()

  useEffect(() => {
    fetchSubscription()
  }, [user])

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/subscription')
      if (response.ok) {
        const data = await response.json()
        setSubscription(data)
      }
    } catch (error) {
      console.error('Error fetching subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleManageBilling = async () => {
    setManagingBilling(true)
    try {
      const response = await fetch('/api/billing', {
        method: 'POST',
      })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Error opening billing portal:', error)
    } finally {
      setManagingBilling(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      </div>
    )
  }

  const isActive = subscription?.subscription_status === 'active' || 
                   subscription?.subscription_status === 'trialing'

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Subscription</h3>
        {isActive && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </span>
        )}
        {!isActive && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Free Plan
          </span>
        )}
      </div>

      {isActive ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            You have unlimited access to receipt extraction.
          </p>
          {subscription.current_period_end && (
            <p className="text-xs text-gray-500">
              Current period ends: {new Date(subscription.current_period_end).toLocaleDateString()}
            </p>
          )}
          <button
            onClick={handleManageBilling}
            disabled={managingBilling}
            className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            {managingBilling ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CreditCard className="h-4 w-4 mr-2" />
            )}
            Manage Billing
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Upgrade to Pro for unlimited extractions.
          </p>
          <PricingCard />
        </div>
      )}
    </div>
  )
}

function PricingCard() {
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID,
        }),
      })

      const data = await response.json()
      
      if (data.sessionId) {
        // Redirect to Stripe Checkout
        const stripe = await import('@stripe/stripe-js')
        const stripeClient = await stripe.loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
        await stripeClient?.redirectToCheckout({ sessionId: data.sessionId })
      }
    } catch (error) {
      console.error('Checkout error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border-2 border-blue-500 rounded-lg p-4">
      <div className="text-center">
        <h4 className="text-lg font-semibold text-gray-900">Pro Plan</h4>
        <div className="mt-2">
          <span className="text-3xl font-bold text-gray-900">$29</span>
          <span className="text-gray-500">/month</span>
        </div>
        <ul className="mt-4 space-y-2 text-sm text-gray-600 text-left">
          <li className="flex items-center">
            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
            Unlimited extractions
          </li>
          <li className="flex items-center">
            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
            CSV export
          </li>
          <li className="flex items-center">
            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
            Email support
          </li>
        </ul>
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="mt-6 w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Upgrade Now'
          )}
        </button>
      </div>
    </div>
  )
}
