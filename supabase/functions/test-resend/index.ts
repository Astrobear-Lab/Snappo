import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({
          error: 'RESEND_API_KEY not found in environment',
          hasKey: false
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      )
    }

    // Test Resend API with a simple request
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Snappo <onboarding@resend.dev>',
        to: 'test@example.com', // Will fail but shows if API key works
        subject: 'Test Email',
        html: '<p>Test</p>',
      }),
    })

    const resendData = await resendResponse.json()

    return new Response(
      JSON.stringify({
        hasKey: true,
        keyPrefix: resendApiKey.substring(0, 5) + '...',
        resendStatus: resendResponse.status,
        resendResponse: resendData,
        message: resendResponse.ok
          ? 'Resend API key is working!'
          : 'Resend API returned an error (check response)'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
