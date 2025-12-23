import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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
    const { photoCodeId, buyerId } = await req.json()

    if (!photoCodeId) {
      throw new Error('Missing photoCodeId parameter')
    }

    // Initialize Supabase client with service role (bypasses RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Update photo code as purchased
    const { data: updatedCode, error: updateError } = await supabaseClient
      .from('photo_codes')
      .update({
        is_purchased: true,
        purchased_by: buyerId || null,
        purchased_at: new Date().toISOString(),
      })
      .eq('id', photoCodeId)
      .select('id, is_purchased')
      .single()

    if (updateError) {
      console.error('Failed to update photo code:', updateError)
      throw new Error(`Failed to mark code as purchased: ${updateError.message}`)
    }

    console.log('Successfully marked code as purchased:', updatedCode)

    return new Response(
      JSON.stringify({ success: true, data: updatedCode }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in mark-code-purchased:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
