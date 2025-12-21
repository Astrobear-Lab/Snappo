import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.11.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { amount, photoCodeId, buyerId, photographerId } = await req.json()

    // Validate input
    if (!amount || !photoCodeId) {
      throw new Error('Missing required parameters: amount, photoCodeId')
    }

    // Initialize Stripe with secret key from environment
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    })

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get photographer's Stripe Connect account ID
    let stripeAccountId = null
    if (photographerId) {
      const { data: photographerData, error: photographerError } = await supabaseClient
        .from('photographer_profiles')
        .select('stripe_account_id, stripe_charges_enabled')
        .eq('id', photographerId)
        .single()

      if (!photographerError && photographerData?.stripe_account_id && photographerData?.stripe_charges_enabled) {
        stripeAccountId = photographerData.stripe_account_id
      }
    }

    // Create payment intent configuration
    const paymentIntentConfig: any = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      // Enable Card, Link, and PayPal (US account)
      payment_method_types: ['card', 'link', 'paypal'],
      metadata: {
        photoCodeId,
        buyerId: buyerId || 'guest',
        photographerId: photographerId || '',
      },
    }

    // If photographer has Stripe Connect, add automatic transfer
    if (stripeAccountId) {
      // Platform fee: $1.00 (100 cents)
      // Photographer receives: $2.00 (automatically transferred)
      paymentIntentConfig.application_fee_amount = 100 // $1 platform fee
      paymentIntentConfig.transfer_data = {
        destination: stripeAccountId,
      }
    }

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentConfig)

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
