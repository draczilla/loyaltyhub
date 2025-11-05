import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SyncRequest {
  businessId: string;
  businessPhone?: string;
  businessName?: string;
  businessEmail?: string;
  listIds?: string[];
}

interface BrevoContactPayload {
  attributes: {
    SMS: string;
    FIRSTNAME?: string;
    COMPANY?: string;
  };
  listIds: number[];
  updateEnabled: boolean;
  smsBlacklisted: boolean;
  emailBlacklisted?: boolean;
  email?: string;
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

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    if (!brevoApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Brevo API key not configured. Please set BREVO_API_KEY in Supabase secrets.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { businessId, businessPhone, businessName, businessEmail, listIds }: SyncRequest = await req.json();

    if (!businessId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "businessId is required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let phoneNumber = businessPhone;
    let companyName = businessName;
    let email = businessEmail;

    if (!phoneNumber || !companyName || !email) {
      const { data: business, error: businessError } = await supabase
        .from("businesses")
        .select("phone, company_name, email")
        .eq("id", businessId)
        .maybeSingle();

      if (businessError || !business) {
        console.error("Error fetching business:", businessError);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Business not found",
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      phoneNumber = phoneNumber || business.phone;
      companyName = companyName || business.company_name;
      email = email || business.email;
    }

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Business does not have a phone number",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let finalListIds = listIds || [];
    if (finalListIds.length === 0) {
      const { data: platformSettings } = await supabase
        .from("platform_settings")
        .select("brevo_default_list_id")
        .maybeSingle();

      if (platformSettings?.brevo_default_list_id) {
        finalListIds = [platformSettings.brevo_default_list_id];
      }
    }

    const brevoPayload: BrevoContactPayload = {
      attributes: {
        SMS: phoneNumber,
        COMPANY: companyName || undefined,
      },
      listIds: finalListIds.map((id: string) => parseInt(id, 10)).filter((id: number) => !isNaN(id)),
      updateEnabled: true,
      smsBlacklisted: false,
    };

    if (email) {
      brevoPayload.email = email;
      brevoPayload.emailBlacklisted = false;
    }

    const brevoResponse = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(brevoPayload),
    });

    const responseText = await brevoResponse.text();
    let brevoData;
    try {
      brevoData = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      brevoData = { rawResponse: responseText };
    }

    if (!brevoResponse.ok) {
      console.error("Brevo API error:", brevoResponse.status, brevoData);

      return new Response(
        JSON.stringify({
          success: false,
          error: brevoData.message || "Failed to sync business contact to Brevo",
          details: brevoData,
          statusCode: brevoResponse.status,
        }),
        {
          status: brevoResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const brevoContactId = brevoData.id?.toString() || null;

    return new Response(
      JSON.stringify({
        success: true,
        brevoContactId,
        listIds: finalListIds,
        message: "Business contact successfully synced to Brevo",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
