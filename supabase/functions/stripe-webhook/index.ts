import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.11.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return new Response(
      JSON.stringify({ error: 'Missing stripe-signature header' }),
      { status: 400 }
    )
  }

  const body = await req.text()

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return new Response(
      JSON.stringify({ error: 'Invalid signature' }),
      { status: 400 }
    )
  }

  console.log(`Processing webhook event: ${event.type}`)

  try {
    switch (event.type) {
      // =====================================================
      // Account Status Updates (Stripe Connect)
      // =====================================================
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account)
        break

      // =====================================================
      // Transfer Events (Platform -> Connected Account)
      // =====================================================
      case 'transfer.created':
        await handleTransferCreated(event.data.object as Stripe.Transfer)
        break

      case 'transfer.paid':
        await handleTransferStatusUpdate(event.data.object as Stripe.Transfer, 'paid')
        break

      case 'transfer.failed':
        await handleTransferStatusUpdate(event.data.object as Stripe.Transfer, 'failed')
        break

      case 'transfer.reversed':
        await handleTransferStatusUpdate(event.data.object as Stripe.Transfer, 'canceled')
        break

      // =====================================================
      // Payout Events (Connected Account -> Bank)
      // =====================================================
      case 'payout.created':
        await handlePayoutCreated(event.data.object as Stripe.Payout, event.account)
        break

      case 'payout.paid':
        await handlePayoutStatusUpdate(event.data.object as Stripe.Payout, 'paid')
        break

      case 'payout.failed':
        await handlePayoutFailed(event.data.object as Stripe.Payout)
        break

      case 'payout.canceled':
        await handlePayoutStatusUpdate(event.data.object as Stripe.Payout, 'canceled')
        break

      // =====================================================
      // Payment Intent Events
      // =====================================================
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200 }
    )
  } catch (err) {
    console.error('Webhook handler error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    )
  }
})

// =====================================================
// Handler Functions
// =====================================================

async function handleAccountUpdated(account: Stripe.Account) {
  console.log(`Updating account status for: ${account.id}`)

  const status = account.charges_enabled
    ? 'active'
    : account.details_submitted
    ? 'pending_verification'
    : 'pending'

  const { error } = await supabaseClient
    .from('photographer_profiles')
    .update({
      stripe_onboarding_completed: account.details_submitted,
      stripe_charges_enabled: account.charges_enabled,
      stripe_account_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_account_id', account.id)

  if (error) {
    console.error('Failed to update account status:', error)
    throw error
  }

  console.log(`Account ${account.id} updated to status: ${status}`)
}

async function handleTransferCreated(transfer: Stripe.Transfer) {
  console.log(`Processing transfer created: ${transfer.id}`)

  // Get photographer by destination account
  const { data: photographer, error: photographerError } = await supabaseClient
    .from('photographer_profiles')
    .select('id')
    .eq('stripe_account_id', transfer.destination)
    .single()

  if (photographerError || !photographer) {
    console.error('Photographer not found for transfer:', transfer.destination)
    return
  }

  // Try to find related transaction from source_transaction (charge ID)
  let transactionData = null
  if (transfer.source_transaction) {
    const { data } = await supabaseClient
      .from('transactions')
      .select('id, photo_code_id')
      .eq('stripe_payment_id', transfer.source_transaction)
      .single()
    transactionData = data
  }

  // Check if payout already exists (idempotency)
  const { data: existingPayout } = await supabaseClient
    .from('payouts')
    .select('id')
    .eq('stripe_transfer_id', transfer.id)
    .single()

  if (existingPayout) {
    console.log(`Transfer ${transfer.id} already recorded, skipping`)
    return
  }

  const { error } = await supabaseClient.from('payouts').insert({
    photographer_id: photographer.id,
    stripe_transfer_id: transfer.id,
    stripe_payment_intent_id: transfer.source_transaction,
    transaction_id: transactionData?.id,
    photo_code_id: transactionData?.photo_code_id,
    amount: transfer.amount / 100, // Convert from cents
    currency: transfer.currency,
    type: 'transfer',
    status: 'pending',
    stripe_created_at: new Date(transfer.created * 1000).toISOString(),
  })

  if (error) {
    console.error('Failed to create transfer record:', error)
    throw error
  }

  console.log(`Transfer ${transfer.id} recorded successfully`)
}

async function handleTransferStatusUpdate(transfer: Stripe.Transfer, status: string) {
  console.log(`Updating transfer ${transfer.id} to status: ${status}`)

  const { error } = await supabaseClient
    .from('payouts')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_transfer_id', transfer.id)

  if (error) {
    console.error('Failed to update transfer status:', error)
    throw error
  }
}

async function handlePayoutCreated(payout: Stripe.Payout, accountId?: string) {
  if (!accountId) {
    console.log('No account ID for payout event, skipping')
    return
  }

  console.log(`Processing payout created: ${payout.id} for account: ${accountId}`)

  // Get photographer by account ID
  const { data: photographer, error: photographerError } = await supabaseClient
    .from('photographer_profiles')
    .select('id')
    .eq('stripe_account_id', accountId)
    .single()

  if (photographerError || !photographer) {
    console.error('Photographer not found for payout:', accountId)
    return
  }

  // Check if payout already exists (idempotency)
  const { data: existingPayout } = await supabaseClient
    .from('payouts')
    .select('id')
    .eq('stripe_payout_id', payout.id)
    .single()

  if (existingPayout) {
    console.log(`Payout ${payout.id} already recorded, skipping`)
    return
  }

  const { error } = await supabaseClient.from('payouts').insert({
    photographer_id: photographer.id,
    stripe_payout_id: payout.id,
    amount: payout.amount / 100, // Convert from cents
    currency: payout.currency,
    type: 'payout',
    status: 'pending',
    stripe_created_at: new Date(payout.created * 1000).toISOString(),
    arrival_date: payout.arrival_date
      ? new Date(payout.arrival_date * 1000).toISOString().split('T')[0]
      : null,
  })

  if (error) {
    console.error('Failed to create payout record:', error)
    throw error
  }

  console.log(`Payout ${payout.id} recorded successfully`)
}

async function handlePayoutStatusUpdate(payout: Stripe.Payout, status: string) {
  console.log(`Updating payout ${payout.id} to status: ${status}`)

  const { error } = await supabaseClient
    .from('payouts')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payout_id', payout.id)

  if (error) {
    console.error('Failed to update payout status:', error)
    throw error
  }
}

async function handlePayoutFailed(payout: Stripe.Payout) {
  console.log(`Processing payout failed: ${payout.id}`)

  const { error } = await supabaseClient
    .from('payouts')
    .update({
      status: 'failed',
      failure_code: payout.failure_code,
      failure_message: payout.failure_message,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payout_id', payout.id)

  if (error) {
    console.error('Failed to update payout failure status:', error)
    throw error
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`Processing payment intent succeeded: ${paymentIntent.id}`)

  // Update transaction status if exists
  const { error } = await supabaseClient
    .from('transactions')
    .update({
      payment_status: 'completed',
    })
    .eq('stripe_payment_id', paymentIntent.id)

  if (error) {
    console.error('Failed to update transaction status:', error)
    // Don't throw - transaction might have been created with a different ID
  }
}
