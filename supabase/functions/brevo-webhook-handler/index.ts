import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BrevoWebhookEvent {
  event: string;
  email: string;
  id: number;
  date: string;
  "message-id": string;
  ts?: number;
  tag?: string;
  subject?: string;
  link?: string;
  reason?: string;
  ip?: string;
  "user-agent"?: string;
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

    const webhookEvents: BrevoWebhookEvent[] = await req.json();
    console.log(`Received ${webhookEvents.length} webhook events from Brevo`);

    for (const event of webhookEvents) {
      console.log(`Processing event: ${event.event} for message-id: ${event["message-id"]}`);

      const { data: communicationLog, error: logError } = await supabase
        .from("communication_logs")
        .select("id, business_id, customer_id, opened_at, open_count")
        .eq("provider_message_id", event["message-id"])
        .maybeSingle();

      if (logError || !communicationLog) {
        console.log(`No communication log found for message-id: ${event["message-id"]}`);
        continue;
      }

      if (event.event === "opened") {
        const { error: insertError } = await supabase
          .from("email_opens")
          .insert({
            communication_log_id: communicationLog.id,
            opened_at: new Date(event.date).toISOString(),
            ip_address: event.ip || null,
            user_agent: event["user-agent"] || null,
            metadata: {
              event_type: event.event,
              brevo_event_id: event.id,
              timestamp: event.ts,
              tag: event.tag,
              raw_event: event,
            },
          });

        if (insertError) {
          console.error("Error inserting email open:", insertError);
        } else {
          console.log(`Recorded email open for log ${communicationLog.id}`);
        }
      } else if (event.event === "click") {
        const { error: updateError } = await supabase
          .from("communication_logs")
          .update({
            metadata: supabase.raw(`
              COALESCE(metadata, '{}'::jsonb) ||
              jsonb_build_object(
                'clicks',
                COALESCE((metadata->>'clicks')::int, 0) + 1,
                'last_click_at',
                '${new Date(event.date).toISOString()}',
                'last_click_link',
                '${event.link || ""}'
              )
            `),
          })
          .eq("id", communicationLog.id);

        if (updateError) {
          console.error("Error updating click data:", updateError);
        } else {
          console.log(`Recorded click for log ${communicationLog.id}`);
        }
      } else if (event.event === "delivered") {
        const { error: updateError } = await supabase
          .from("communication_logs")
          .update({
            status: "delivered",
            metadata: supabase.raw(`
              COALESCE(metadata, '{}'::jsonb) ||
              jsonb_build_object('delivered_at', '${new Date(event.date).toISOString()}')
            `),
          })
          .eq("id", communicationLog.id);

        if (updateError) {
          console.error("Error updating delivery status:", updateError);
        } else {
          console.log(`Updated delivery status for log ${communicationLog.id}`);
        }
      } else if (event.event === "soft_bounce" || event.event === "hard_bounce") {
        const { error: updateError } = await supabase
          .from("communication_logs")
          .update({
            status: "bounced",
            error_message: event.reason || `Email bounced (${event.event})`,
            metadata: supabase.raw(`
              COALESCE(metadata, '{}'::jsonb) ||
              jsonb_build_object(
                'bounce_type',
                '${event.event}',
                'bounce_reason',
                '${event.reason || ""}',
                'bounced_at',
                '${new Date(event.date).toISOString()}'
              )
            `),
          })
          .eq("id", communicationLog.id);

        if (updateError) {
          console.error("Error updating bounce status:", updateError);
        } else {
          console.log(`Updated bounce status for log ${communicationLog.id}`);
        }
      } else if (event.event === "spam" || event.event === "blocked") {
        const { error: updateError } = await supabase
          .from("communication_logs")
          .update({
            status: "failed",
            error_message: event.reason || `Email ${event.event}`,
            metadata: supabase.raw(`
              COALESCE(metadata, '{}'::jsonb) ||
              jsonb_build_object(
                'failure_type',
                '${event.event}',
                'failure_reason',
                '${event.reason || ""}',
                'failed_at',
                '${new Date(event.date).toISOString()}'
              )
            `),
          })
          .eq("id", communicationLog.id);

        if (updateError) {
          console.error("Error updating failure status:", updateError);
        } else {
          console.log(`Updated failure status for log ${communicationLog.id}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: webhookEvents.length }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in brevo-webhook-handler:", error);
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
