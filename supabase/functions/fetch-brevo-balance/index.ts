import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BrevoAccountResponse {
  plan: Array<{
    type: string;
    credits: number;
    creditsUsed: number;
  }>;
}

interface BrevoBalanceData {
  emailCredits: number;
  smsCredits: number;
  currencyBalance: number;
  totalSpent: number;
  currency: string;
}

async function fetchBrevoAccountInfo(apiKey: string): Promise<BrevoBalanceData> {
  try {
    const response = await fetch("https://api.brevo.com/v3/account", {
      method: "GET",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Brevo API error:", errorText);
      throw new Error(`Brevo API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json() as BrevoAccountResponse;

    let emailCredits = 0;
    let smsCredits = 0;

    if (data.plan && Array.isArray(data.plan)) {
      for (const plan of data.plan) {
        if (plan.type === 'email') {
          emailCredits = plan.credits - (plan.creditsUsed || 0);
        } else if (plan.type === 'sms') {
          smsCredits = plan.credits - (plan.creditsUsed || 0);
        }
      }
    }

    return {
      emailCredits: emailCredits,
      smsCredits: smsCredits,
      currencyBalance: 0,
      totalSpent: 0,
      currency: 'USD',
    };
  } catch (error) {
    console.error("Error fetching Brevo account info:", error);
    throw error;
  }
}

async function checkBalanceThresholds(
  supabase: SupabaseClient,
  emailCredits: number,
  smsCredits: number
): Promise<void> {
  try {
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("balance_thresholds, alert_email, alert_phone, balance_monitoring_enabled")
      .limit(1)
      .maybeSingle();

    if (!settings || !settings.balance_monitoring_enabled) {
      return;
    }

    const thresholds = settings.balance_thresholds || { email_credits: 1000, sms_credits: 500 };
    const alerts = [];

    if (emailCredits <= thresholds.email_credits) {
      const { data: recentAlert } = await supabase
        .from("system_alerts")
        .select("id")
        .eq("alert_type", "balance_low")
        .eq("metadata->>credit_type", "email")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (!recentAlert) {
        alerts.push({
          alert_type: "balance_low",
          severity: emailCredits <= thresholds.email_credits * 0.5 ? "critical" : "warning",
          title: "Low Email Credits",
          message: `Email credits have fallen below the threshold. Current balance: ${emailCredits} credits. Threshold: ${thresholds.email_credits} credits.`,
          metadata: {
            credit_type: "email",
            current_balance: emailCredits,
            threshold: thresholds.email_credits,
          },
          sent_to_email: settings.alert_email,
          sent_to_phone: null,
        });
      }
    }

    if (smsCredits <= thresholds.sms_credits) {
      const { data: recentAlert } = await supabase
        .from("system_alerts")
        .select("id")
        .eq("alert_type", "balance_low")
        .eq("metadata->>credit_type", "sms")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (!recentAlert) {
        alerts.push({
          alert_type: "balance_low",
          severity: smsCredits <= thresholds.sms_credits * 0.5 ? "critical" : "warning",
          title: "Low SMS Credits",
          message: `SMS credits have fallen below the threshold. Current balance: ${smsCredits} credits. Threshold: ${thresholds.sms_credits} credits.`,
          metadata: {
            credit_type: "sms",
            current_balance: smsCredits,
            threshold: thresholds.sms_credits,
          },
          sent_to_email: settings.alert_email,
          sent_to_phone: settings.alert_phone,
        });
      }
    }

    if (alerts.length > 0) {
      await supabase.from("system_alerts").insert(alerts);

      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      for (const alert of alerts) {
        if (alert.sent_to_email || alert.sent_to_phone) {
          await fetch(`${supabaseUrl}/functions/v1/send-system-alert`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              type: "balance_alert",
              alert_data: alert,
            }),
          }).catch((err) => console.error("Failed to send alert:", err));
        }
      }
    }

    await supabase
      .from("platform_settings")
      .update({ last_balance_check: new Date().toISOString() })
      .limit(1);
  } catch (error) {
    console.error("Error checking balance thresholds:", error);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: superAdmin } = await supabase
      .from("super_admins")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!superAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Super admin access required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const brevoApiKey = Deno.env.get("BREVO_API_KEY");

    if (!brevoApiKey) {
      return new Response(
        JSON.stringify({
          error: "Brevo API key not configured",
          emailCredits: 0,
          smsCredits: 0,
          currencyBalance: 0,
          configured: false,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const balanceData = await fetchBrevoAccountInfo(brevoApiKey);

    await supabase.from("brevo_account_balance").insert({
      email_credits: balanceData.emailCredits,
      sms_credits: balanceData.smsCredits,
      currency_balance: balanceData.currencyBalance,
      total_spent: balanceData.totalSpent,
      currency: balanceData.currency,
      last_sync_at: new Date().toISOString(),
    });

    await checkBalanceThresholds(
      supabase,
      balanceData.emailCredits,
      balanceData.smsCredits
    );

    return new Response(
      JSON.stringify({
        success: true,
        emailCredits: balanceData.emailCredits,
        smsCredits: balanceData.smsCredits,
        currencyBalance: balanceData.currencyBalance,
        totalSpent: balanceData.totalSpent,
        currency: balanceData.currency,
        lastSync: new Date().toISOString(),
        configured: true,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in fetch-brevo-balance:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
