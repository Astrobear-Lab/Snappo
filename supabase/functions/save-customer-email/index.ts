import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    // Get request body
    const { codeId, email } = await req.json()

    // Validate inputs
    if (!codeId || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: codeId and email' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Update photo_codes table with customer email
    const { data: updateData, error: updateError } = await supabase
      .from('photo_codes')
      .update({
        customer_email: email,
        email_collected_at: new Date().toISOString(),
      })
      .eq('id', codeId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating photo_codes:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to save email', details: updateError }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Send confirmation email via Resend
    try {
      const resendApiKey = Deno.env.get('RESEND_API_KEY')

      if (resendApiKey) {
        const confirmationHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .emoji { font-size: 48px; margin-bottom: 20px; }
                h1 { color: #2563eb; margin-bottom: 10px; }
                .content { background: #f9fafb; padding: 30px; border-radius: 10px; margin: 20px 0; }
                .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
                .code { font-family: monospace; background: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-size: 18px; font-weight: bold; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="emoji">✨</div>
                  <h1>Your Moment is Reserved!</h1>
                </div>

                <div class="content">
                  <p>Thank you for providing your email address!</p>

                  <p>We'll notify you as soon as your photographer uploads your photos.</p>

                  <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                    Your code: <span class="code">${updateData.code}</span>
                  </p>
                </div>

                <div class="footer">
                  <p>See you soon!</p>
                  <p>© ${new Date().getFullYear()} Snappo. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `

        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Snappo <no-reply@snappo.life>',
            to: email,
            subject: '✨ Your Moment is Reserved!',
            html: confirmationHtml,
          }),
        })

        if (resendResponse.ok) {
          const resendData = await resendResponse.json()
          console.log(`Confirmation email sent to ${email}, ID: ${resendData.id}`)
        } else {
          const errorData = await resendResponse.json()
          console.error('Failed to send confirmation email:', errorData)
        }
      } else {
        console.log(`Email collected: ${email} for code: ${updateData.code} (No Resend API key)`)
      }
    } catch (emailError) {
      // Don't fail the request if confirmation email fails
      console.error('Confirmation email error:', emailError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email saved successfully',
        data: updateData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
