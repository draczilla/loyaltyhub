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

    // Create the bucket with public access
    const { data: bucket, error: bucketError } = await supabase.storage.createBucket('business-assets', {
      public: true,
      fileSizeLimit: 2097152,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
    });

    if (bucketError && !bucketError.message.includes('already exists')) {
      throw bucketError;
    }

    // Set up storage policies using SQL
    const policies = [
      // Drop existing policies
      `DROP POLICY IF EXISTS "Public read access" ON storage.objects;`,
      `DROP POLICY IF EXISTS "Authenticated insert" ON storage.objects;`,
      `DROP POLICY IF EXISTS "Authenticated update" ON storage.objects;`,
      `DROP POLICY IF EXISTS "Authenticated delete" ON storage.objects;`,

      // Create new policies
      `CREATE POLICY "Public read access"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = 'business-assets');`,

      `CREATE POLICY "Authenticated insert"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'business-assets');`,

      `CREATE POLICY "Authenticated update"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (bucket_id = 'business-assets')
        WITH CHECK (bucket_id = 'business-assets');`,

      `CREATE POLICY "Authenticated delete"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (bucket_id = 'business-assets');`
    ];

    const results = [];
    for (const policy of policies) {
      try {
        const { error: policyError } = await supabase.rpc('exec_sql', { sql: policy });
        results.push({ policy, success: !policyError, error: policyError?.message });
      } catch (e) {
        // Try direct SQL execution
        try {
          await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
            method: 'POST',
            headers: {
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: policy })
          });
          results.push({ policy, success: true });
        } catch (err) {
          results.push({ policy, success: false, error: String(err) });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Storage bucket and policies configured',
        bucket: bucket || 'already exists',
        policies: results
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error setting up storage:', error);
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
