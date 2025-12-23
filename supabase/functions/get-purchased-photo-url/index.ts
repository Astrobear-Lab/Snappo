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
    const { photoId, photoCodeId } = await req.json()

    if (!photoId || !photoCodeId) {
      throw new Error('Missing photoId or photoCodeId parameter')
    }

    // Initialize Supabase client with service role (bypasses RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Verify that the photo code is purchased
    const { data: photoCode, error: codeError } = await supabaseClient
      .from('photo_codes')
      .select('is_purchased')
      .eq('id', photoCodeId)
      .single()

    if (codeError || !photoCode) {
      console.error('Photo code query error:', codeError)
      throw new Error('Photo code not found')
    }

    if (!photoCode.is_purchased) {
      throw new Error('Photo code has not been purchased')
    }

    // Verify that this photo belongs to this code
    const { data: codePhoto, error: codePhotoError } = await supabaseClient
      .from('code_photos')
      .select('photo_id')
      .eq('code_id', photoCodeId)
      .eq('photo_id', photoId)
      .single()

    if (codePhotoError || !codePhoto) {
      console.error('Code-photo relationship error:', codePhotoError)
      throw new Error('Photo does not belong to this code')
    }

    // Get photo details
    const { data: photo, error: photoError } = await supabaseClient
      .from('photos')
      .select('file_url, watermarked_url')
      .eq('id', photoId)
      .single()

    if (photoError || !photo) {
      console.error('Photo not found:', photoError)
      throw new Error('Photo not found')
    }

    console.log('Attempting to create signed URL for:', photo.file_url)

    // Create signed URL using service role (bypasses RLS)
    const { data: signedUrl, error: urlError } = await supabaseClient.storage
      .from('photos-original')
      .createSignedUrl(photo.file_url, 60 * 60) // 1 hour

    if (urlError) {
      console.error('Failed to create signed URL for original:', urlError)
      console.log('Falling back to watermarked version')

      // Fallback to watermarked/blurred version if original doesn't exist
      const { data: blurredUrl } = supabaseClient.storage
        .from('photos')
        .getPublicUrl(photo.watermarked_url)

      return new Response(
        JSON.stringify({
          signedUrl: blurredUrl.publicUrl,
          isOriginal: false,
          fallback: true
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    return new Response(
      JSON.stringify({
        signedUrl: signedUrl.signedUrl,
        isOriginal: true,
        fallback: false
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
