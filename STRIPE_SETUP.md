# Stripe Setup for ReceiptFlow

## 1. Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and create an account
2. Get your API keys from the Dashboard

## 2. Add Environment Variables

Add to `.env.local`:

```
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...  # Create this in Stripe Dashboard
```

## 3. Create Product & Price in Stripe

1. Go to Stripe Dashboard → Products
2. Create a product:
   - Name: "ReceiptFlow Pro"
   - Description: "Unlimited receipt extractions"
3. Add a price:
   - Recurring, Monthly
   - Amount: $29.00
4. Copy the Price ID (starts with `price_`)

## 4. Set Up Webhook

For local testing:
```bash
stripe listen --forward-to localhost:3000/api/webhook
```

Copy the webhook signing secret to `.env.local`

For production, add endpoint in Stripe Dashboard:
- URL: `https://yourdomain.com/api/webhook`
- Events to listen for:
  - `checkout.session.completed`
  - `invoice.payment_succeeded`
  - `customer.subscription.deleted`

## 5. Test Payments

Use Stripe test card: `4242 4242 4242 4242`
- Any future expiry date
- Any 3-digit CVC
- Any ZIP
