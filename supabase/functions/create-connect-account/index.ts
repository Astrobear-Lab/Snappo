import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.11.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { photographerId, email, country = 'US' } = await req.json()

    if (!photographerId || !email) {
      throw new Error('Missing required parameters: photographerId, email')
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    })

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Check if photographer already has a Stripe account
    const { data: existingProfile, error: profileError } = await supabaseClient
      .from('photographer_profiles')
      .select('stripe_account_id, stripe_onboarding_completed')
      .eq('id', photographerId)
      .single()

    if (profileError) {
      throw new Error('Photographer profile not found')
    }

    let accountId = existingProfile.stripe_account_id

    // Create new account if doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: country,
        email: email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          photographerId: photographerId,
          platform: 'snappo',
        },
      })

      accountId = account.id

      // Save account ID to database
      const { error: updateError } = await supabaseClient
        .from('photographer_profiles')
        .update({
          stripe_account_id: accountId,
          stripe_account_status: 'pending',
        })
        .eq('id', photographerId)

      if (updateError) {
        console.error('Failed to update photographer profile:', updateError)
        throw new Error('Failed to save Stripe account')
      }
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${Deno.env.get('APP_URL')}/dashboard`,
      return_url: `${Deno.env.get('APP_URL')}/dashboard?connect=success`,
      type: 'account_onboarding',
    })

    return new Response(
      JSON.stringify({
        accountId: accountId,
        onboardingUrl: accountLink.url,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Create Connect account error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
