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
  forceProvider?: 'brevo' | 'twilio';
}

interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: string;
}

async function sendSmsViaBrevo(
  apiKey: string,
  sender: string,
  recipientPhone: string,
  message: string
): Promise<SmsResult> {
  try {
    const response = await fetch("https://api.brevo.com/v3/transactionalSMS/sms", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: sender,
        recipient: recipientPhone,
        content: message,
        type: "transactional",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Brevo SMS API error:", errorText);
      return {
        success: false,
        error: `Brevo API returned ${response.status}: ${errorText}`,
        provider: 'brevo',
      };
    }

    const responseData = await response.json();
    const messageId = responseData.reference || responseData.messageId;

    return {
      success: true,
      messageId: messageId || undefined,
      provider: 'brevo',
    };
  } catch (error) {
    console.error("Error sending SMS via Brevo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      provider: 'brevo',
    };
  }
}

async function sendSmsViaTwilio(
  accountSid: string,
  authToken: string,
  fromNumber: string,
  recipientPhone: string,
  message: string
): Promise<SmsResult> {
  try {
    const credentials = btoa(`${accountSid}:${authToken}`);

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: recipientPhone,
          From: fromNumber,
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Twilio SMS API error:", errorText);
      return {
        success: false,
        error: `Twilio API returned ${response.status}: ${errorText}`,
        provider: 'twilio',
      };
    }

    const responseData = await response.json();
    const messageId = responseData.sid;

    return {
      success: true,
      messageId: messageId || undefined,
      provider: 'twilio',
    };
  } catch (error) {
    console.error("Error sending SMS via Twilio:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      provider: 'twilio',
    };
  }
}

async function updateProviderStatus(
  supabase: any,
  provider: string,
  success: boolean,
  error?: string
) {
  try {
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("sms_provider_status")
      .limit(1)
      .maybeSingle();

    if (!settings) return;

    const status = settings.sms_provider_status || {};
    const providerStatus = status[provider] || {};

    const updatedStatus = {
      ...status,
      [provider]: {
        healthy: success,
        last_success_at: success ? new Date().toISOString() : providerStatus.last_success_at,
        last_failure_at: success ? providerStatus.last_failure_at : new Date().toISOString(),
        failure_count: success ? 0 : (providerStatus.failure_count || 0) + 1,
        last_error: success ? null : error,
      },
    };

    await supabase
      .from("platform_settings")
      .update({ sms_provider_status: updatedStatus })
      .limit(1);
  } catch (err) {
    console.error("Error updating provider status:", err);
  }
}

async function sendSystemAlert(
  supabase: any,
  fromProvider: string,
  toProvider: string,
  error: string
) {
  try {
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("alert_email, alert_phone")
      .limit(1)
      .maybeSingle();

    if (!settings) return;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    if (settings.alert_email && supabaseUrl) {
      await fetch(`${supabaseUrl}/functions/v1/send-system-alert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          type: 'sms_provider_switch',
          from_provider: fromProvider,
          to_provider: toProvider,
          error: error,
          alert_email: settings.alert_email,
          alert_phone: settings.alert_phone,
        }),
      }).catch(err => console.error("Failed to send system alert:", err));
    }
  } catch (err) {
    console.error("Error sending system alert:", err);
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: TransactionalSmsRequest = await req.json();
    const { businessId, customerId, triggerType, variables = {}, recipientPhone, message, isTestSms, forceProvider } = body;

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

    const { data: platformSettings } = await supabase
      .from("platform_settings")
      .select("primary_sms_provider")
      .limit(1)
      .maybeSingle();

    const primaryProvider = forceProvider || platformSettings?.primary_sms_provider || 'brevo';
    const fallbackProvider = primaryProvider === 'brevo' ? 'twilio' : 'brevo';

    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const brevoSender = Deno.env.get("BREVO_SMS_SENDER");
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

    const hasBrevo = !!(brevoApiKey && brevoSender);
    const hasTwilio = !!(twilioSid && twilioToken && twilioPhone);

    if (!hasBrevo && !hasTwilio) {
      console.error("SMS Provider Configuration Error: No providers configured");
      console.error("Brevo Config:", { hasApiKey: !!brevoApiKey, hasSender: !!brevoSender });
      console.error("Twilio Config:", { hasSid: !!twilioSid, hasToken: !!twilioToken, hasPhone: !!twilioPhone });

      return new Response(
        JSON.stringify({
          error: "No SMS provider configured. Please configure Brevo or Twilio credentials in Supabase Edge Function secrets.",
          details: {
            brevo: {
              apiKey: brevoApiKey ? "Set" : "Missing BREVO_API_KEY secret",
              sender: brevoSender ? "Set" : "Missing BREVO_SMS_SENDER secret"
            },
            twilio: {
              accountSid: twilioSid ? "Set" : "Missing TWILIO_ACCOUNT_SID secret",
              authToken: twilioToken ? "Set" : "Missing TWILIO_AUTH_TOKEN secret",
              phoneNumber: twilioPhone ? "Set" : "Missing TWILIO_PHONE_NUMBER secret"
            }
          }
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!hasBrevo) {
      console.warn("Brevo SMS not configured:", {
        hasApiKey: !!brevoApiKey,
        hasSender: !!brevoSender,
        message: "BREVO_API_KEY and BREVO_SMS_SENDER must be set in Supabase Edge Function secrets"
      });
    }

    if (!hasTwilio) {
      console.warn("Twilio SMS not configured:", {
        hasSid: !!twilioSid,
        hasToken: !!twilioToken,
        hasPhone: !!twilioPhone,
        message: "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER must be set in Supabase Edge Function secrets"
      });
    }

    let sendResult: SmsResult;
    let usedProvider = primaryProvider;

    if (primaryProvider === 'brevo' && hasBrevo) {
      sendResult = await sendSmsViaBrevo(brevoApiKey!, brevoSender!, finalRecipientPhone, finalMessage);

      if (!sendResult.success && hasTwilio) {
        console.log(`Brevo failed, falling back to Twilio. Error: ${sendResult.error}`);
        await updateProviderStatus(supabase, 'brevo', false, sendResult.error);
        await sendSystemAlert(supabase, 'brevo', 'twilio', sendResult.error || 'Unknown error');

        sendResult = await sendSmsViaTwilio(twilioSid!, twilioToken!, twilioPhone!, finalRecipientPhone, finalMessage);
        usedProvider = 'twilio';
      }
    } else if (primaryProvider === 'twilio' && hasTwilio) {
      sendResult = await sendSmsViaTwilio(twilioSid!, twilioToken!, twilioPhone!, finalRecipientPhone, finalMessage);

      if (!sendResult.success && hasBrevo) {
        console.log(`Twilio failed, falling back to Brevo. Error: ${sendResult.error}`);
        await updateProviderStatus(supabase, 'twilio', false, sendResult.error);
        await sendSystemAlert(supabase, 'twilio', 'brevo', sendResult.error || 'Unknown error');

        sendResult = await sendSmsViaBrevo(brevoApiKey!, brevoSender!, finalRecipientPhone, finalMessage);
        usedProvider = 'brevo';
      }
    } else {
      if (hasBrevo) {
        sendResult = await sendSmsViaBrevo(brevoApiKey!, brevoSender!, finalRecipientPhone, finalMessage);
        usedProvider = 'brevo';
      } else {
        sendResult = await sendSmsViaTwilio(twilioSid!, twilioToken!, twilioPhone!, finalRecipientPhone, finalMessage);
        usedProvider = 'twilio';
      }
    }

    if (sendResult.success) {
      await updateProviderStatus(supabase, usedProvider, true);
    } else {
      await updateProviderStatus(supabase, usedProvider, false, sendResult.error);
    }

    if (!isTestSms && businessId) {
      const { error: logError } = await supabase
        .from("communication_logs")
        .insert({
          business_id: businessId,
          customer_id: customerId || null,
          type: "sms",
          content: finalMessage,
          status: sendResult.success ? "sent" : "failed",
          error_message: sendResult.error || null,
          provider: usedProvider,
          provider_message_id: sendResult.messageId || null,
          metadata: {
            recipient_phone: finalRecipientPhone,
          },
        });

      if (logError) {
        console.error("Error logging SMS:", logError);
      }

      if (business && customer) {
        await supabase.from("sms_logs").insert({
          business_id: businessId,
          customer_id: customerId,
          recipient_phone: customer.phone,
          message: finalMessage,
          status: sendResult.success ? 'sent' : 'failed',
          provider_message_id: sendResult.messageId,
          provider: usedProvider,
          error_message: sendResult.error || null,
          segments: 1,
        });
      }

      if (sendResult.success) {
        await supabase.rpc("increment_business_usage", {
          p_business_id: businessId,
          p_column_name: "usage_sms_monthly",
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: sendResult.success,
        messageId: sendResult.messageId,
        provider: usedProvider,
        error: sendResult.error,
      }),
      {
        status: sendResult.success ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
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
