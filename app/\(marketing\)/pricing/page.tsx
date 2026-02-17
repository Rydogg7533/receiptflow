'use client'

import { useSupabase } from '@/components/SupabaseProvider'
import Link from 'next/link'
import { Check, ArrowRight } from 'lucide-react'
import { useState } from 'react'

interface PricingTier {
  name: string
  price: number
  description: string
  features: string[]
  cta: string
  priceId: string
  badge?: string
  highlighted?: boolean
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Single Tool',
    price: 9,
    description: 'Perfect for getting started',
    features: [
      'Access to one tool',
      'Up to 100 documents/month',
      'Email support',
      'Basic integrations',
    ],
    cta: 'Get Started',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_SINGLE || 'price_placeholder_single',
  },
  {
    name: 'Pro Bundle',
    price: 29,
    description: 'Recommended for most users',
    features: [
      'Access to all tools',
      'Unlimited documents',
      'Priority support',
      'Advanced integrations',
      'Custom branding',
      'API access',
    ],
    cta: 'Subscribe Now',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUNDLE || 'price_placeholder_bundle',
    badge: 'BEST VALUE',
    highlighted: true,
  },
  {
    name: 'Team',
    price: 79,
    description: 'For growing teams',
    features: [
      'Everything in Pro',
      'Up to 5 team members',
      'Shared workspaces',
      'Advanced analytics',
      'Dedicated support',
      'Custom integrations',
    ],
    cta: 'Coming Soon',
    priceId: 'price_placeholder_team',
  },
]

export default function PricingPage() {
  const { user } = useSupabase()
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const handleCheckout = async (priceId: string) => {
    if (!user) {
      window.location.href = '/signup'
      return
    }

    setIsLoading(priceId)

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })

      if (response.ok) {
        const { sessionId } = await response.json()
        // Redirect to Stripe checkout would happen here
        // window.location.href = `https://checkout.stripe.com/pay/${sessionId}`
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="bg-gradient-to-b from-zinc-950 to-zinc-900 min-h-screen py-12 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-zinc-400 mb-8">
            Choose the plan that fits your needs. All plans include a 14-day free trial.
          </p>

          {/* Billing Toggle (optional for future) */}
          <div className="flex items-center justify-center gap-4 text-sm">
            <span className="text-zinc-300">Billed Monthly</span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {pricingTiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-lg border p-8 transition-all ${
                tier.highlighted
                  ? 'bg-gradient-to-b from-blue-600/10 to-blue-600/5 border-blue-500/30 shadow-lg shadow-blue-500/10 md:scale-105'
                  : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {/* Badge */}
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {tier.badge}
                  </span>
                </div>
              )}

              {/* Content */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
                  <p className="text-zinc-400 text-sm">{tier.description}</p>
                </div>

                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">${tier.price}</span>
                    <span className="text-zinc-400">/month</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">Billed monthly • Cancel anytime</p>
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleCheckout(tier.priceId)}
                  disabled={isLoading === tier.priceId || tier.name === 'Team'}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                    tier.highlighted
                      ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
                      : tier.name === 'Team'
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                  }`}
                >
                  {isLoading === tier.priceId ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Loading...
                    </>
                  ) : (
                    <>
                      {tier.cta}
                      {tier.cta !== 'Coming Soon' && <ArrowRight size={16} />}
                    </>
                  )}
                </button>

                {/* Free Trial Info */}
                <p className="text-xs text-zinc-500 text-center">
                  14 days free • No credit card required
                </p>
              </div>

              {/* Features */}
              <div className="mt-8 pt-8 border-t border-zinc-800/50 space-y-3">
                {tier.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-zinc-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            {[
              {
                q: 'Can I change plans anytime?',
                a: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect on your next billing cycle.',
              },
              {
                q: 'Is there a free trial?',
                a: 'Yes, all plans include a 14-day free trial. No credit card required to get started.',
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit cards, debit cards, and digital wallets through Stripe.',
              },
              {
                q: 'Can I cancel my subscription?',
                a: 'Yes, you can cancel anytime. Your access continues until the end of your billing period.',
              },
              {
                q: 'Do you offer refunds?',
                a: 'We offer a 30-day money-back guarantee if you\'re not satisfied with our service.',
              },
              {
                q: 'Is there an API for integrations?',
                a: 'Yes, API access is available with the Pro Bundle and Team plans. Contact us for details.',
              },
            ].map((item) => (
              <div key={item.q} className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                <h3 className="font-semibold text-white mb-2">{item.q}</h3>
                <p className="text-zinc-400 text-sm">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-2xl mx-auto mt-16 text-center">
          <div className="bg-gradient-to-r from-blue-600/10 to-cyan-600/10 border border-blue-500/30 rounded-lg p-8">
            <h3 className="text-2xl font-bold text-white mb-4">Ready to get started?</h3>
            <p className="text-zinc-300 mb-6">
              {user
                ? 'Choose a plan above and start your free trial today.'
                : 'Create an account and start your 14-day free trial.'}
            </p>
            {!user && (
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Sign Up for Free
                <ArrowRight size={18} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
