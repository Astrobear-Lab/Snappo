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
    console.log('[send-email-notification] Function invoked')

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
    console.log('[send-email-notification] Request:', { codeId, photoCount })

    if (!codeId) {
      throw new Error('Missing codeId')
    }

    // Get photo code data
    const { data: codeData, error: codeError } = await supabaseClient
      .from('photo_codes')
      .select('code, customer_email, email_sent')
      .eq('id', codeId)
      .single()

    if (codeError) {
      console.error('[send-email-notification] Code fetch error:', codeError)
      throw codeError
    }

    console.log('[send-email-notification] Code data:', codeData)

    // Check if email exists
    if (!codeData.customer_email) {
      console.log('[send-email-notification] No email collected yet')
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No email collected'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Check if email already sent
    if (codeData.email_sent) {
      console.log('[send-email-notification] Email already sent')
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Email already sent'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Create email content
    const appUrl = Deno.env.get('APP_URL') || 'https://snappo.vercel.app'
    const photoUrl = `${appUrl}/photo/${codeData.code}`

    const htmlContent = `
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
            .button { display: inline-block; background: #2563eb; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
            .code { font-family: monospace; background: #e5e7eb; padding: 4px 8px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="emoji">🎁</div>
              <h1>Your Photos Are Ready!</h1>
            </div>

            <div class="content">
              <p>Great news! Your photographer uploaded <strong>${photoCount} photo${photoCount > 1 ? 's' : ''}</strong> for you.</p>

              <p>Click the button below to view and download your photos:</p>

              <center>
                <a href="${photoUrl}" class="button">View My Photos</a>
              </center>

              <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                Or copy this link: <br>
                <a href="${photoUrl}">${photoUrl}</a>
              </p>

              <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                Your code: <span class="code">${codeData.code}</span>
              </p>
            </div>

            <div class="footer">
              <p>This email was sent because you requested to be notified when your photos are ready.</p>
              <p>© ${new Date().getFullYear()} Snappo. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `

    const textContent = `
🎁 Your Photos Are Ready!

Your photographer uploaded ${photoCount} photo${photoCount > 1 ? 's' : ''} for you.

View and download your photos:
${photoUrl}

Your code: ${codeData.code}

- Snappo Team
    `.trim()

    console.log('[send-email-notification] Preparing to send email to:', codeData.customer_email)

    // Check for Resend API key
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!resendApiKey) {
      console.log('[send-email-notification] MOCK MODE - Resend API key not configured')
      console.log('[send-email-notification] Would send email:', textContent)

      // Mock success - update database without sending actual email
      const { error: updateError } = await supabaseClient
        .from('photo_codes')
        .update({
          email_sent: true,
          email_sent_at: new Date().toISOString(),
        })
        .eq('id', codeId)

      if (updateError) {
        console.error('[send-email-notification] Update error:', updateError)
      }

      return new Response(
        JSON.stringify({
          success: true,
          mock: true,
          message: 'Email sending mocked (Resend API key not configured)',
          email: codeData.customer_email,
          messageContent: textContent,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Real email sending using Resend
    console.log('[send-email-notification] Sending email via Resend to:', codeData.customer_email)

    // Domain verified - can send to any email now!

    try {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Snappo <no-reply@snappo.life>',
          to: codeData.customer_email,
          subject: '🎁 Your Photos Are Ready!',
          html: htmlContent,
          text: textContent,
        }),
      })

      const resendData = await resendResponse.json()

      if (!resendResponse.ok) {
        console.error('[send-email-notification] Resend error:', resendData)

        // If it's a domain validation error (403), return a more helpful message
        if (resendResponse.status === 403) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'domain_verification_required',
              message: resendData.message || 'Domain verification required. You can only send to your verified email.',
              resendError: resendData,
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200 // Return 200 so it doesn't appear as a server error
            }
          )
        }

        throw new Error(`Resend error: ${resendData.message || 'Unknown error'}`)
      }

      console.log('[send-email-notification] Email sent successfully via Resend:', resendData.id)

      // Update photo_codes to mark email as sent
      const { error: updateError } = await supabaseClient
        .from('photo_codes')
        .update({
          email_sent: true,
          email_sent_at: new Date().toISOString(),
        })
        .eq('id', codeId)

      if (updateError) {
        console.error('[send-email-notification] Update error:', updateError)
        // Don't throw - email was sent successfully
      }

      return new Response(
        JSON.stringify({
          success: true,
          email: codeData.customer_email,
          emailId: resendData.id,
          message: 'Email sent successfully',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    } catch (emailError) {
      console.error('[send-email-notification] Email sending error:', emailError)

      return new Response(
        JSON.stringify({
          success: false,
          error: 'email_send_failed',
          message: emailError.message || 'Failed to send email',
          details: emailError.toString(),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 // Return 200 with error details instead of 500
        }
      )
    }
  } catch (error) {
    console.error('[send-email-notification] Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'internal_error',
        message: error.message || 'Internal server error',
        details: error.toString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Return 200 with error details
      }
    )
  }
})
