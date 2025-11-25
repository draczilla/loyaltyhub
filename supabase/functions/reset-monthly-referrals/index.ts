import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ResetResult {
  success: boolean;
  codesReset: number;
  message: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current date info
    const now = new Date();
    const currentMonth = now.toISOString().substring(0, 7); // YYYY-MM format

    console.log(`[Reset Monthly Referrals] Starting monthly reset for ${currentMonth}`);

    // Get all referral codes that need to be reset
    const { data: referralCodes, error: fetchError } = await supabase
      .from('referral_codes')
      .select('id, business_id, current_month_referrals, current_month_reset_date')
      .gt('current_month_referrals', 0);

    if (fetchError) {
      console.error('[Reset Monthly Referrals] Error fetching referral codes:', fetchError);
      throw fetchError;
    }

    if (!referralCodes || referralCodes.length === 0) {
      console.log('[Reset Monthly Referrals] No referral codes to reset');
      return new Response(
        JSON.stringify({
          success: true,
          codesReset: 0,
          message: 'No referral codes needed resetting',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Filter codes that need resetting (last reset was not this month)
    const codesToReset = referralCodes.filter(code => {
      const resetDate = new Date(code.current_month_reset_date);
      const resetMonth = resetDate.toISOString().substring(0, 7);
      return resetMonth !== currentMonth;
    });

    console.log(`[Reset Monthly Referrals] Found ${codesToReset.length} codes to reset`);

    if (codesToReset.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          codesReset: 0,
          message: 'All referral codes already reset for current month',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Reset all qualifying codes
    const { error: updateError } = await supabase
      .from('referral_codes')
      .update({
        current_month_referrals: 0,
        current_month_reset_date: now.toISOString(),
      })
      .in(
        'id',
        codesToReset.map(code => code.id)
      );

    if (updateError) {
      console.error('[Reset Monthly Referrals] Error updating referral codes:', updateError);
      throw updateError;
    }

    console.log(`[Reset Monthly Referrals] Successfully reset ${codesToReset.length} referral codes`);

    // Send summary notification to active referrers (optional - can be implemented later)
    // This would send an email to users who had successful referrals in the previous month

    const result: ResetResult = {
      success: true,
      codesReset: codesToReset.length,
      message: `Successfully reset ${codesToReset.length} referral codes for ${currentMonth}`,
    };

    return new Response(
      JSON.stringify(result),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('[Reset Monthly Referrals] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        codesReset: 0,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
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