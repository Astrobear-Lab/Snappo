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
    const { photoId } = await req.json()

    if (!photoId) {
      throw new Error('Missing photoId parameter')
    }

    // Initialize Supabase client with service role (bypasses RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get photo details
    const { data: photo, error: photoError } = await supabaseClient
      .from('photos')
      .select('file_url, is_sample')
      .eq('id', photoId)
      .single()

    if (photoError || !photo) {
      throw new Error('Photo not found')
    }

    // Only allow if photo is marked as sample
    if (!photo.is_sample) {
      throw new Error('Photo is not a sample')
    }

    // Create signed URL using service role (bypasses RLS)
    const { data: signedUrl, error: urlError } = await supabaseClient.storage
      .from('photos-original')
      .createSignedUrl(photo.file_url, 60 * 60) // 1 hour

    if (urlError) {
      throw new Error(`Failed to create signed URL: ${urlError.message}`)
    }

    return new Response(
      JSON.stringify({ signedUrl: signedUrl.signedUrl }),
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
