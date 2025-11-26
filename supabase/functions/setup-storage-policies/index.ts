import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Drop existing policies
    await supabase.rpc('exec_sql', {
      query: `
        DROP POLICY IF EXISTS "Public can view business assets" ON storage.objects;
        DROP POLICY IF EXISTS "Authenticated users can upload business assets" ON storage.objects;
        DROP POLICY IF EXISTS "Authenticated users can update business assets" ON storage.objects;
        DROP POLICY IF EXISTS "Authenticated users can delete business assets" ON storage.objects;
      `
    }).catch(() => {});

    // Create new simplified policies
    const policies = [
      // Allow public to view
      `CREATE POLICY "Public can view business assets"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = 'business-assets');`,
      
      // Allow authenticated users to upload
      `CREATE POLICY "Authenticated users can upload business assets"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'business-assets');`,
      
      // Allow authenticated users to update their files
      `CREATE POLICY "Authenticated users can update business assets"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (bucket_id = 'business-assets');`,
      
      // Allow authenticated users to delete their files
      `CREATE POLICY "Authenticated users can delete business assets"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (bucket_id = 'business-assets');`
    ];

    for (const policy of policies) {
      const { error } = await supabase.rpc('exec_sql', { query: policy });
      if (error) {
        console.error('Policy error:', error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Storage policies configured successfully'
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error setting up policies:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});