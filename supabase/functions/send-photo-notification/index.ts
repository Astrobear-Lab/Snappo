import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  codeId: string
  photoCount: number
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[send-photo-notification] Function invoked')

    // Initialize Supabase client
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
    const { codeId, photoCount }: NotificationRequest = await req.json()
    console.log('[send-photo-notification] Request:', { codeId, photoCount })

    if (!codeId) {
      throw new Error('Missing codeId')
    }

    // Get photo code data
    const { data: codeData, error: codeError } = await supabaseClient
      .from('photo_codes')
      .select('code, customer_phone, sms_sent')
      .eq('id', codeId)
      .single()

    if (codeError) {
      console.error('[send-photo-notification] Code fetch error:', codeError)
      throw codeError
    }

    console.log('[send-photo-notification] Code data:', codeData)

    // Check if phone number exists
    if (!codeData.customer_phone) {
      console.log('[send-photo-notification] No phone number collected yet')
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No phone number collected'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Check if SMS already sent
    if (codeData.sms_sent) {
      console.log('[send-photo-notification] SMS already sent')
      return new Response(
        JSON.stringify({
          success: false,
          message: 'SMS already sent'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Create message
    const appUrl = Deno.env.get('APP_URL') || 'https://snappo.vercel.app'
    const photoUrl = `${appUrl}/photo/${codeData.code}`
    const message = `🎁 Your moment is ready.\nYour photographer uploaded your ${photoCount} photo${photoCount > 1 ? 's' : ''}.\nView and download: ${photoUrl}`

    console.log('[send-photo-notification] Message prepared:', message)
    console.log('[send-photo-notification] Would send to:', codeData.customer_phone)

    // Check if running in MOCK mode (no Twilio credentials)
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.log('[send-photo-notification] MOCK MODE - Twilio not configured')
      console.log('[send-photo-notification] Would send SMS:', message)

      // Mock success - update database without sending actual SMS
      const { error: updateError } = await supabaseClient
        .from('photo_codes')
        .update({
          sms_sent: true,
          sms_sent_at: new Date().toISOString(),
        })
        .eq('id', codeId)

      if (updateError) {
        console.error('[send-photo-notification] Update error:', updateError)
      }

      return new Response(
        JSON.stringify({
          success: true,
          mock: true,
          message: 'SMS sending mocked (Twilio not configured)',
          phone: codeData.customer_phone,
          messageContent: message,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Real Twilio SMS sending
    console.log('[send-photo-notification] Sending SMS via Twilio to:', codeData.customer_phone)

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`
    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: codeData.customer_phone,
        From: twilioPhoneNumber,
        Body: message,
      }),
    })

    const twilioData = await twilioResponse.json()

    if (!twilioResponse.ok) {
      console.error('[send-photo-notification] Twilio error:', twilioData)
      throw new Error(`Twilio error: ${twilioData.message || 'Unknown error'}`)
    }

    console.log('[send-photo-notification] SMS sent successfully:', twilioData.sid)

    // Update photo_codes to mark SMS as sent
    const { error: updateError } = await supabaseClient
      .from('photo_codes')
      .update({
        sms_sent: true,
        sms_sent_at: new Date().toISOString(),
      })
      .eq('id', codeId)

    if (updateError) {
      console.error('[send-photo-notification] Update error:', updateError)
      // Don't throw - SMS was sent successfully
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageSid: twilioData.sid,
        phone: codeData.customer_phone,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('[send-photo-notification] Error:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
