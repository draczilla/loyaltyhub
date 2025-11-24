import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const TRANSPARENT_GIF = Uint8Array.from(
  atob(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
  ),
  (c) => c.charCodeAt(0)
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  console.warn("[DEPRECATED] track-email-open function is deprecated. LoyaltyHub now uses Brevo's native tracking API via webhooks and periodic polling. This endpoint remains for backwards compatibility with legacy emails only.");
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(TRANSPARENT_GIF, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "image/gif",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration");
      return new Response(TRANSPARENT_GIF, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "image/gif",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: communicationLog, error: logError } = await supabase
      .from("communication_logs")
      .select("id, business_id, customer_id")
      .eq("tracking_token", token)
      .maybeSingle();

    if (logError || !communicationLog) {
      console.log(`No communication log found for token: ${token}`);
      return new Response(TRANSPARENT_GIF, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "image/gif",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    const userAgent = req.headers.get("user-agent") || null;
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const ipAddress = forwardedFor?.split(",")[0].trim() || realIp || null;

    const { error: insertError } = await supabase
      .from("email_opens")
      .insert({
        communication_log_id: communicationLog.id,
        opened_at: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: {
          headers: {
            "user-agent": userAgent,
            "x-forwarded-for": forwardedFor,
            "x-real-ip": realIp,
          },
        },
      });

    if (insertError) {
      console.error("Error inserting email open:", insertError);
    }

    return new Response(TRANSPARENT_GIF, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "image/gif",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("Error tracking email open:", error);
    return new Response(TRANSPARENT_GIF, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "image/gif",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }
});
