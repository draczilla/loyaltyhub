import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TransactionalSmsRequest {
  businessId?: string;
  customerId?: string;
  triggerType?: 'welcome' | 'reward_earned' | 'points_milestone' | 'birthday';
  variables?: Record<string, any>;
  recipientPhone?: string;
  message?: string;
  isTestSms?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: TransactionalSmsRequest = await req.json();
    const { businessId, customerId, triggerType, variables = {}, recipientPhone, message, isTestSms } = body;

    if (isTestSms) {
      if (!recipientPhone || !message) {
        return new Response(
          JSON.stringify({ error: "Missing recipientPhone or message for test SMS" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } else {
      if (!businessId || !customerId || !triggerType) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    let business: any = null;
    let customer: any = null;
    let finalMessage: string;
    let finalRecipientPhone: string;

    if (isTestSms) {
      finalMessage = message!;
      finalRecipientPhone = recipientPhone!;
    } else {
      const { data: businessData } = await supabase
        .from("businesses")
        .select("id, company_name, tier_id, usage_sms_monthly, subscription_status")
        .eq("id", businessId!)
        .maybeSingle();

      if (!businessData) {
        return new Response(
          JSON.stringify({ error: "Business not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      business = businessData;

      const { data: customerData } = await supabase
        .from("customers")
        .select("id, phone, first_name, last_name, total_points, opted_in_sms")
        .eq("id", customerId!)
        .eq("business_id", businessId!)
        .maybeSingle();

      if (!customerData || !customerData.phone || !customerData.opted_in_sms) {
        return new Response(
          JSON.stringify({ error: "Customer not found, has no phone, or not opted in to SMS" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      customer = customerData;

      const { data: template } = await supabase
        .from("sms_templates")
        .select("*")
        .eq("business_id", businessId!)
        .eq("trigger_type", triggerType!)
        .eq("active", true)
        .maybeSingle();

      if (!template) {
        return new Response(
          JSON.stringify({ error: `No active template found for trigger type: ${triggerType}` }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data: tier } = await supabase
        .from("subscription_tiers")
        .select("max_sms_monthly")
        .eq("id", business.tier_id)
        .maybeSingle();

      if (tier && tier.max_sms_monthly > 0) {
        if (business.usage_sms_monthly >= tier.max_sms_monthly) {
          return new Response(
            JSON.stringify({ error: "SMS quota exceeded" }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }

      finalMessage = template.message_template;
      finalMessage = finalMessage.replace(/\{business_name\}/g, business.company_name);
      finalMessage = finalMessage.replace(/\{name\}/g, `${customer.first_name || ''} ${customer.last_name || ''}`.trim());
      finalMessage = finalMessage.replace(/\{firstName\}/g, customer.first_name || '');
      finalMessage = finalMessage.replace(/\{lastName\}/g, customer.last_name || '');
      finalMessage = finalMessage.replace(/\{points\}/g, customer.total_points?.toString() || '0');

      Object.keys(variables).forEach((key) => {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        finalMessage = finalMessage.replace(regex, variables[key]?.toString() || '');
      });

      finalRecipientPhone = customer.phone;
    }

    let apiKey: string;
    let apiSecret: string;
    let fromNumber: string;

    if (businessId && !isTestSms) {
      const { data: integration } = await supabase
        .from("integrations")
        .select("credentials")
        .eq("business_id", businessId)
        .eq("service", "vonage")
        .eq("active", true)
        .maybeSingle();

      if (integration && integration.credentials) {
        apiKey = integration.credentials.apiKey;
        apiSecret = integration.credentials.apiSecret;
        fromNumber = integration.credentials.fromNumber || integration.credentials.senderId;
      } else {
        const platformApiKey = Deno.env.get("VONAGE_API_KEY");
        const platformApiSecret = Deno.env.get("VONAGE_API_SECRET");
        const platformFromNumber = Deno.env.get("VONAGE_FROM_NUMBER");

        if (!platformApiKey || !platformApiSecret) {
          return new Response(
            JSON.stringify({ error: "Vonage integration not configured for this business and no platform credentials available" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        if (!platformFromNumber) {
          return new Response(
            JSON.stringify({ error: "Platform Vonage From Number not configured" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        apiKey = platformApiKey;
        apiSecret = platformApiSecret;
        fromNumber = platformFromNumber;
      }
    } else {
      const platformApiKey = Deno.env.get("VONAGE_API_KEY");
      const platformApiSecret = Deno.env.get("VONAGE_API_SECRET");
      const platformFromNumber = Deno.env.get("VONAGE_FROM_NUMBER");

      if (!platformApiKey || !platformApiSecret || !platformFromNumber) {
        return new Response(
          JSON.stringify({ error: "Platform Vonage credentials not configured" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      apiKey = platformApiKey;
      apiSecret = platformApiSecret;
      fromNumber = platformFromNumber;
    }

    try {
      const vonageApiUrl = `https://rest.nexmo.com/sms/json`;

      const vonageResponse = await fetch(vonageApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey,
          api_secret: apiSecret,
          to: finalRecipientPhone,
          from: fromNumber,
          text: finalMessage,
        }),
      });

      const response = await vonageResponse.json();

      const messageId = response.messages?.[0]?.["message-id"] || response.messages?.[0]?.messageId;
      const status = response.messages?.[0]?.status;

      if (status !== "0") {
        const errorText = response.messages?.[0]?.["error-text"] || "Failed to send SMS";
        throw new Error(errorText);
      }

      if (!isTestSms && businessId && business && customer) {
        await supabase
          .from("businesses")
          .update({ usage_sms_monthly: business.usage_sms_monthly + 1 })
          .eq("id", businessId);

        await supabase.from("sms_logs").insert({
          business_id: businessId,
          customer_id: customerId,
          recipient_phone: customer.phone,
          message: finalMessage,
          status: 'sent',
          provider_message_id: messageId,
          segments: 1,
        });
      }

      return new Response(
        JSON.stringify({ success: true, messageId: messageId }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Failed to send SMS:", error);

      if (!isTestSms && businessId && customer) {
        await supabase.from("sms_logs").insert({
          business_id: businessId,
          customer_id: customerId,
          recipient_phone: customer.phone,
          message: finalMessage,
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          segments: 1,
        });
      }

      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : "Failed to send SMS" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Error in send-transactional-sms function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
