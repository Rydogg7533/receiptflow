import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export const getOrCreateCustomer = async (userId: string, email: string) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16',
  })

  // Search for existing customer
  const customers = await stripe.customers.list({
    email,
    limit: 1,
  })

  if (customers.data.length > 0) {
    return customers.data[0].id
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      userId,
    },
  })

  return customer.id
}
