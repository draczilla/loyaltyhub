import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BrevoEmailEventResponse {
  events: Array<{
    event: string;
    email: string;
    messageId: string;
    date: string;
    subject?: string;
    tag?: string;
    ip?: string;
    link?: string;
  }>;
  count: number;
}

async function fetchBrevoEmailEvents(
  apiKey: string,
  messageId: string
): Promise<BrevoEmailEventResponse | null> {
  try {
    const response = await fetch(
      `https://api.brevo.com/v3/smtp/statistics/events?messageId=${encodeURIComponent(messageId)}&limit=100`,
      {
        method: "GET",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Brevo API error for message ${messageId}:`, errorText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching Brevo stats for message ${messageId}:`, error);
    return null;
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
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !brevoApiKey) {
      throw new Error("Missing configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: recentEmails, error: emailsError } = await supabase
      .from("communication_logs")
      .select("id, provider_message_id, opened_at")
      .eq("type", "email")
      .eq("provider", "brevo")
      .eq("tracking_method", "brevo_native")
      .is("opened_at", null)
      .gte("created_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(50);

    if (emailsError) {
      throw new Error(`Failed to fetch emails: ${emailsError.message}`);
    }

    if (!recentEmails || recentEmails.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No recent emails to check", checked: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Checking ${recentEmails.length} recent emails for tracking stats`);

    let updatedCount = 0;

    for (const email of recentEmails) {
      if (!email.provider_message_id) continue;

      const stats = await fetchBrevoEmailEvents(brevoApiKey, email.provider_message_id);

      if (!stats || !stats.events) continue;

      const openEvents = stats.events.filter((e) => e.event === "opened");
      const clickEvents = stats.events.filter((e) => e.event === "click");

      if (openEvents.length > 0) {
        const firstOpen = openEvents[0];

        for (const openEvent of openEvents) {
          const { error: insertError } = await supabase
            .from("email_opens")
            .insert({
              communication_log_id: email.id,
              opened_at: new Date(openEvent.date).toISOString(),
              ip_address: openEvent.ip || null,
              user_agent: null,
              metadata: {
                event_type: "opened",
                brevo_message_id: openEvent.messageId,
                tag: openEvent.tag,
                fetched_via_api: true,
              },
            });

          if (insertError) {
            console.error(`Error inserting open event for ${email.id}:`, insertError);
          }
        }

        if (clickEvents.length > 0) {
          const { error: updateError } = await supabase
            .from("communication_logs")
            .update({
              metadata: supabase.raw(`
                COALESCE(metadata, '{}'::jsonb) ||
                jsonb_build_object(
                  'clicks',
                  ${clickEvents.length},
                  'click_events',
                  '${JSON.stringify(clickEvents)}'::jsonb
                )
              `),
            })
            .eq("id", email.id);

          if (updateError) {
            console.error(`Error updating click data for ${email.id}:`, updateError);
          }
        }

        updatedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: recentEmails.length,
        updated: updatedCount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in fetch-brevo-email-stats:", error);
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
