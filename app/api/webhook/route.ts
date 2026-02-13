import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'

const relevantEvents = new Set([
  'checkout.session.completed',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'customer.subscription.deleted',
  'customer.subscription.updated',
])

export async function POST(request: NextRequest) {
  const payload = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  if (!relevantEvents.has(event.type)) {
    return NextResponse.json({ received: true })
  }

  const supabase = createRouteHandlerClient({ cookies })

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.mode === 'subscription') {
          const subscriptionId = session.subscription as string
          
          // Get subscription details
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          
          // Update user profile with subscription info
          await supabase
            .from('profiles')
            .upsert({
              id: session.metadata?.userId,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: subscriptionId,
              subscription_status: 'active',
              price_id: subscription.items.data[0].price.id,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          )
          
          await supabase
            .from('profiles')
            .update({
              subscription_status: 'active',
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('stripe_subscription_id', invoice.subscription)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'past_due',
          })
          .eq('stripe_subscription_id', invoice.subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'canceled',
            stripe_subscription_id: null,
          })
          .eq('stripe_subscription_id', subscription.id)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        
        await supabase
          .from('profiles')
          .update({
            subscription_status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)
        break
      }
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
