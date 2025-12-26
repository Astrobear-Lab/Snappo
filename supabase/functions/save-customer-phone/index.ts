import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SavePhoneRequest {
  codeId: string
  phoneNumber: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[save-customer-phone] Function invoked')

    // Initialize Supabase client with SERVICE ROLE (bypasses RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Parse request
    const { codeId, phoneNumber }: SavePhoneRequest = await req.json()
    console.log('[save-customer-phone] Request:', { codeId, phoneNumber: phoneNumber ? '***' : null })

    if (!codeId || !phoneNumber) {
      throw new Error('Missing codeId or phoneNumber')
    }

    // Validate phone number format (E.164)
    const phoneRegex = /^\+[1-9]\d{7,14}$/
    if (!phoneRegex.test(phoneNumber)) {
      throw new Error('Invalid phone number format. Must be E.164 format (e.g., +15551234567)')
    }

    // Update photo_codes with phone number (using service role bypasses RLS)
    const { data, error } = await supabaseClient
      .from('photo_codes')
      .update({
        customer_phone: phoneNumber,
        phone_collected_at: new Date().toISOString(),
      })
      .eq('id', codeId)
      .select()
      .single()

    if (error) {
      console.error('[save-customer-phone] Update error:', error)
      throw error
    }

    console.log('[save-customer-phone] Phone number saved successfully')

    // Send confirmation SMS
    try {
      const appUrl = Deno.env.get('APP_URL') || 'https://snappo.vercel.app'
      const photoUrl = `${appUrl}/photo/${data.code}`
      const confirmMessage = `🎁 Your moment is reserved. Your photographer will upload your photos soon. We'll text you when they're ready.\n\nView status: ${photoUrl}`

      const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
      const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
      const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

      if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
        console.log('[save-customer-phone] Sending confirmation SMS')

        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`
        const twilioResponse = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: phoneNumber,
            From: twilioPhoneNumber,
            Body: confirmMessage,
          }),
        })

        if (twilioResponse.ok) {
          const twilioData = await twilioResponse.json()
          console.log('[save-customer-phone] Confirmation SMS sent:', twilioData.sid)
        } else {
          const error = await twilioResponse.json()
          console.error('[save-customer-phone] SMS send failed:', error)
        }
      } else {
        console.log('[save-customer-phone] Twilio not configured, skipping confirmation SMS')
      }
    } catch (smsError) {
      console.error('[save-customer-phone] Confirmation SMS error:', smsError)
      // Don't fail the request if SMS fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        code: data.code,
        customer_phone: data.customer_phone,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('[save-customer-phone] Error:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
