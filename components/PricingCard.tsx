'use client'

import { useState } from 'react'
import { loadStripe, Stripe } from '@stripe/stripe-js'
import { CreditCard, Check, Loader2 } from 'lucide-react'

// Only load Stripe if we have a real key (not a placeholder)
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise: Promise<Stripe | null> | null = 
  stripeKey && !stripeKey.includes('placeholder') 
    ? loadStripe(stripeKey) 
    : null

interface PricingCardProps {
  isSubscribed: boolean
  subscriptionStatus?: string
}

export function PricingCard({ isSubscribed, subscriptionStatus }: PricingCardProps) {
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async () => {
    if (!stripePromise) {
      alert('Stripe is not configured. Please set up a Stripe account to enable payments.')
      return
    }
    
    setLoading(true)
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID,
        }),
      })

      const { sessionId, error } = await response.json()

      if (error) {
        console.error('Checkout error:', error)
        return
      }

      const stripe = await stripePromise
      if (stripe) {
        await stripe.redirectToCheckout({ sessionId })
      }
    } catch (error) {
      console.error('Subscribe error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleManageBilling = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/billing', { method: 'POST' })
      const { url, error } = await response.json()

      if (error) {
        console.error('Billing error:', error)
        return
      }

      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Billing error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (isSubscribed && subscriptionStatus === 'active') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-green-900">Pro Plan Active</h3>
            <p className="text-sm text-green-700">Unlimited receipt extractions</p>
          </div>
        </div>
        <button
          onClick={handleManageBilling}
          disabled={loading}
          className="w-full py-2 px-4 border border-green-300 rounded-md text-sm font-medium text-green-700 bg-white hover:bg-green-50 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Loading...
            </span>
          ) : (
            'Manage Subscription'
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center mb-4">
        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
          <CreditCard className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Upgrade to Pro</h3>
          <p className="text-sm text-gray-600">Unlimited extractions</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline">
          <span className="text-3xl font-bold text-gray-900">$29</span>
          <span className="text-gray-500 ml-2">/month</span>
        </div>
        <ul className="mt-4 space-y-2">
          <li className="flex items-center text-sm text-gray-600">
            <Check className="h-4 w-4 text-green-500 mr-2" />
            Unlimited receipt uploads
          </li>
          <li className="flex items-center text-sm text-gray-600">
            <Check className="h-4 w-4 text-green-500 mr-2" />
            AI-powered data extraction
          </li>
          <li className="flex items-center text-sm text-gray-600">
            <Check className="h-4 w-4 text-green-500 mr-2" />
            CSV export
          </li>
          <li className="flex items-center text-sm text-gray-600">
            <Check className="h-4 w-4 text-green-500 mr-2" />
            Email support
          </li>
        </ul>
      </div>

      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Loading...
          </span>
        ) : (
          'Subscribe Now'
        )}
      </button>
    </div>
  )
}
