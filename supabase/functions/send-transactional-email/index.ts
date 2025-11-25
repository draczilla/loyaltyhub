import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendEmailRequest {
  businessId?: string;
  customerId?: string | null;
  templateId?: string;
  templateName?: string;
  subject: string;
  body: string;
  recipientEmail: string;
  recipientName?: string;
  isTestEmail?: boolean;
}

interface EmailConfig {
  brevoApiKey?: string;
  sendgridApiKey?: string;
  fromEmail?: string;
  fromName?: string;
}

async function sendEmailViaBrevo(
  apiKey: string,
  fromEmail: string,
  fromName: string,
  toEmail: string,
  toName: string | undefined,
  subject: string,
  htmlContent: string,
  enableTracking: boolean = true
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          email: fromEmail,
          name: fromName,
        },
        to: [
          {
            email: toEmail,
            name: toName || toEmail,
          },
        ],
        subject: subject,
        htmlContent: htmlContent,
        tracking: {
          opens: enableTracking,
          clicks: enableTracking,
          unsubscribe: false
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Brevo API error:", errorText);
      return {
        success: false,
        error: `Brevo API returned ${response.status}: ${errorText}`,
      };
    }

    const responseData = await response.json();
    const messageId = responseData.messageId;

    return {
      success: true,
      messageId: messageId || undefined,
    };
  } catch (error) {
    console.error("Error sending email via Brevo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function sendEmailViaSendGrid(
  apiKey: string,
  fromEmail: string,
  fromName: string,
  toEmail: string,
  toName: string | undefined,
  subject: string,
  htmlContent: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({        personalizations: [
          {
            to: [{ email: toEmail, name: toName || toEmail }],
            subject: subject,
          },
        ],
        from: {
          email: fromEmail,
          name: fromName,
        },
        content: [
          {
            type: "text/html",
            value: htmlContent,
          },
        ],
        tracking_settings: {
          click_tracking: { enable: true },
          open_tracking: { enable: false },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("SendGrid API error:", errorText);
      return {
        success: false,
        error: `SendGrid API returned ${response.status}: ${errorText}`,
      };
    }

    const messageId = response.headers.get("x-message-id");

    return {
      success: true,
      messageId: messageId || undefined,
    };
  } catch (error) {
    console.error("Error sending email via SendGrid:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function convertPlainTextToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const paragraphs = escaped.split(/\n\n+/).map((para) => {
    const lines = para.split(/\n/).join("<br>");
    return `<p>${lines}</p>`;
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  ${paragraphs.join("\n")}
</body>
</html>
  `.trim();
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

    const emailRequest: SendEmailRequest = await req.json();
    const { businessId, customerId, templateId, templateName, subject, body, recipientEmail, recipientName, isTestEmail } = emailRequest;

    if (!subject || !body || !recipientEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let business: any = null;
    let emailTrackingEnabled = false;
    let resolvedBusinessId = businessId;

    if (isTestEmail) {
      emailTrackingEnabled = true;
    } else {
      if (!businessId) {
        return new Response(
          JSON.stringify({ error: "Missing businessId for non-test email" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log("Looking up business with ID:", businessId);
      console.log("Authenticated user ID:", user.id);

      let { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .select("id, tier_id, usage_email_monthly, tenant_id")
        .eq("id", businessId)
        .maybeSingle();

      console.log("Direct business lookup result:", { businessData, businessError });

      if (businessError || !businessData) {
        console.log("Direct business lookup failed, checking if user is tenant member...");

        const { data: memberData, error: memberError } = await supabase
          .from("tenant_members")
          .select("tenant_id")
          .eq("user_id", businessId)
          .eq("status", "active")
          .maybeSingle();

        console.log("Tenant member lookup result:", { memberData, memberError });

        if (memberData?.tenant_id) {
          const { data: tenantData, error: tenantError } = await supabase
            .from("tenants")
            .select("admin_user_id")
            .eq("id", memberData.tenant_id)
            .maybeSingle();

          console.log("Tenant lookup result:", { tenantData, tenantError });

          if (tenantData?.admin_user_id) {
            const { data: adminBusinessData, error: adminBusinessError } = await supabase
              .from("businesses")
              .select("id, tier_id, usage_email_monthly, tenant_id")
              .eq("id", tenantData.admin_user_id)
              .maybeSingle();

            console.log("Admin business lookup result:", { adminBusinessData, adminBusinessError });

            if (adminBusinessData) {
              businessData = adminBusinessData;
              resolvedBusinessId = adminBusinessData.id;
              businessError = null;
              console.log("Found business via tenant admin lookup, resolved ID:", resolvedBusinessId);
            }
          }
        }

        if (!businessData) {
          console.error("Business not found after all lookup attempts:", {
            businessId,
            userId: user.id,
            businessError,
            memberData
          });
          return new Response(
            JSON.stringify({
              error: "Business not found",
              details: "Unable to find business record or tenant membership. Please contact support.",
              businessId,
              userId: user.id
            }),
            {
              status: 404,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }

      business = businessData;
      emailTrackingEnabled = true;

      const { data: tier } = await supabase
        .from("subscription_tiers")
        .select("features")
        .eq("id", business.tier_id)
        .maybeSingle();

      const emailLimit = tier?.features?.email_monthly || 50;

      if (business.usage_email_monthly >= emailLimit) {
        return new Response(
          JSON.stringify({ error: "Email quota exceeded for this billing period" }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    if (isTestEmail && resolvedBusinessId) {
      const { data: rateLimitData, error: rateLimitError } = await supabase
        .rpc("check_test_email_rate_limit", { p_business_id: resolvedBusinessId })
        .maybeSingle();

      if (rateLimitError) {
        console.error("Error checking rate limit:", rateLimitError);
        return new Response(
          JSON.stringify({ error: "Failed to check rate limit" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (rateLimitData && !rateLimitData.allowed) {
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded",
            message: `You have reached the limit of ${rateLimitData.limit} test emails per hour. Please try again after ${new Date(rateLimitData.reset_at).toLocaleTimeString()}.`,
            remaining: rateLimitData.remaining,
            reset_at: rateLimitData.reset_at,
            limit: rateLimitData.limit,
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    if (!isTestEmail) {
      const { data: allowanceData, error: allowanceError } = await supabase
        .rpc("get_daily_email_allowance")
        .maybeSingle();

      if (allowanceError) {
        console.error("Error checking daily allowance:", allowanceError);
      } else if (allowanceData && allowanceData.remaining_today <= 0) {
        return new Response(
          JSON.stringify({
            error: "Daily email limit reached",
            message: `Daily limit of ${allowanceData.daily_limit} emails has been reached. Limit resets at midnight UTC.`,
            sent_today: allowanceData.sent_today,
            daily_limit: allowanceData.daily_limit,
            reset_time: allowanceData.reset_time,
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    let emailConfig: EmailConfig = {};

    if (resolvedBusinessId && !isTestEmail) {
      const { data: integration } = await supabase
        .from("integrations")
        .select("email_config")
        .eq("business_id", resolvedBusinessId)
        .eq("active", true)
        .maybeSingle();

      if (integration?.email_config) {
        emailConfig = integration.email_config as EmailConfig;
      }
    }

    const platformBrevoKey = Deno.env.get("BREVO_API_KEY");
    const platformSendGridKey = Deno.env.get("SENDGRID_API_KEY");
    const platformFromEmail = Deno.env.get("EMAIL_FROM");
    const platformFromName = Deno.env.get("EMAIL_FROM_NAME");

    console.log("Environment check:", {
      hasBrevoKey: !!platformBrevoKey,
      brevoKeyLength: platformBrevoKey?.length || 0,
      hasSendGridKey: !!platformSendGridKey,
      hasFromEmail: !!platformFromEmail,
      fromEmail: platformFromEmail,
      hasFromName: !!platformFromName,
      fromName: platformFromName,
      isTestEmail: isTestEmail
    });

    const brevoApiKey = emailConfig.brevoApiKey || platformBrevoKey;
    const sendgridApiKey = emailConfig.sendgridApiKey || platformSendGridKey;
    const fromEmail = emailConfig.fromEmail || platformFromEmail;
    const fromName = emailConfig.fromName || platformFromName;

    const useBrevo = !!brevoApiKey;
    const useSendGrid = !!sendgridApiKey;

    if ((!useBrevo && !useSendGrid) || !fromEmail || !fromName) {
      return new Response(
        JSON.stringify({
          error: "Email configuration not found. Please configure Brevo or SendGrid credentials.",
          debug: {
            hasBrevoKey: !!platformBrevoKey,
            hasSendGridKey: !!platformSendGridKey,
            hasFromEmail: !!platformFromEmail,
            hasFromName: !!platformFromName
          }
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let htmlBody = body.includes("<html") || body.includes("<body") || body.includes("<p>")
      ? body
      : convertPlainTextToHtml(body);

    const trackingToken = crypto.randomUUID();

    if (emailTrackingEnabled) {
      const trackingPixelUrl = `${supabaseUrl}/functions/v1/track-email-open?token=${trackingToken}`;
      const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:block; border:0;" />`;

      if (htmlBody.includes("</body>")) {
        htmlBody = htmlBody.replace("</body>", `${trackingPixel}</body>`);
      } else {
        htmlBody += trackingPixel;
      }
    }

    console.log("Sending email:", {
      useBrevo,
      useSendGrid,
      hasBrevoKey: !!brevoApiKey,
      brevoKeyPrefix: brevoApiKey?.substring(0, 10),
      fromEmail,
      fromName,
      recipientEmail,
      trackingEnabled: emailTrackingEnabled,
      hasTrackingToken: !!trackingToken
    });

    const sendResult = useBrevo
      ? await sendEmailViaBrevo(
          brevoApiKey!,
          fromEmail,
          fromName,
          recipientEmail,
          recipientName,
          subject,
          htmlBody,
          emailTrackingEnabled
        )
      : await sendEmailViaSendGrid(
          sendgridApiKey!,
          fromEmail,
          fromName,
          recipientEmail,
          recipientName,
          subject,
          htmlBody
        );

    if (resolvedBusinessId) {
      const { error: logError } = await supabase
        .from("communication_logs")
        .insert({
          business_id: resolvedBusinessId,
          customer_id: customerId || null,
          type: "email",
          template_id: templateId || null,
          template_name: templateName || null,
          subject: subject,
          content: body,
          status: sendResult.success ? "sent" : "failed",
          error_message: sendResult.error || null,
          tracking_token: emailTrackingEnabled ? trackingToken : null,
          provider: useBrevo ? "brevo" : "sendgrid",
          provider_message_id: sendResult.messageId || null,
          is_test_email: isTestEmail || false,
          metadata: {
            recipient_email: recipientEmail,
            recipient_name: recipientName,
            from_email: fromEmail,
            from_name: fromName,
            tracking_enabled: emailTrackingEnabled,
          },
        });

      if (logError) {
        console.error("Error logging email:", logError);
      }

      if (sendResult.success && isTestEmail) {
        await supabase.rpc("increment_test_email_count", {
          p_business_id: resolvedBusinessId,
        });
      }

      if (sendResult.success && !isTestEmail) {
        await supabase.rpc("increment_business_usage", {
          p_business_id: resolvedBusinessId,
          p_column_name: "usage_email_monthly",
        });

        const { error: creditError } = await supabase.rpc("deduct_credits", {
          p_business_id: resolvedBusinessId,
          p_amount: 1,
          p_reason: "Email sent",
        });

        if (creditError) {
          console.error("Error deducting email credit:", creditError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: sendResult.success,
        messageId: sendResult.messageId,
        error: sendResult.error,
      }),
      {
        status: sendResult.success ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-transactional-email:", error);
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