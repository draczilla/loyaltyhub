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
      console.log("No tracking token provided");
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

    console.log("Tracking email open for token:", token);

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
      .select("id, business_id, customer_id, opened_at, open_count")
      .eq("tracking_token", token)
      .maybeSingle();

    if (logError) {
      console.error("Error looking up communication log:", logError);
      return new Response(TRANSPARENT_GIF, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "image/gif",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    if (!communicationLog) {
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

    console.log("Found communication log:", communicationLog.id);

    // Update the communication log with open information
    const newOpenCount = (communicationLog.open_count || 0) + 1;
    const updateData: any = {
      open_count: newOpenCount,
    };

    // Set opened_at only on first open
    if (!communicationLog.opened_at) {
      updateData.opened_at = new Date().toISOString();
      console.log("First open detected, setting opened_at");
    }

    const { error: updateError } = await supabase
      .from("communication_logs")
      .update(updateData)
      .eq("id", communicationLog.id);

    if (updateError) {
      console.error("Error updating communication log:", updateError);
    } else {
      console.log(`Successfully tracked email open. Open count: ${newOpenCount}`);
    }

    // Also insert into email_opens table if it exists
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
      console.log("Note: email_opens table might not exist (this is optional):", insertError.message);
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