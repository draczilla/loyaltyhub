import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendEmailRequest {
  businessId: string;
  customerId?: string | null;
  templateId?: string;
  templateName?: string;
  subject: string;
  body: string;
  recipientEmail: string;
  recipientName?: string;
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
  htmlContent: string
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
      body: JSON.stringify({
        personalizations: [
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

function injectTrackingPixel(htmlBody: string, trackingToken: string, supabaseUrl: string): string {
  const trackingPixelUrl = `${supabaseUrl}/functions/v1/track-email-open?token=${trackingToken}`;
  const trackingPixelHtml = `<img src="${trackingPixelUrl}" alt="" width="1" height="1" style="display:block;border:0;outline:none;" />`;

  if (htmlBody.toLowerCase().includes("</body>")) {
    return htmlBody.replace(/<\/body>/i, `${trackingPixelHtml}</body>`);
  } else {
    return `${htmlBody}${trackingPixelHtml}`;
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
    const { businessId, customerId, templateId, templateName, subject, body, recipientEmail, recipientName } = emailRequest;

    if (!businessId || !subject || !body || !recipientEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("subscription_tier_id, usage_email_monthly, email_tracking_enabled")
      .eq("id", businessId)
      .maybeSingle();

    if (businessError || !business) {
      return new Response(
        JSON.stringify({ error: "Business not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: tier } = await supabase
      .from("subscription_tiers")
      .select("features")
      .eq("id", business.subscription_tier_id)
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

    let emailConfig: EmailConfig = {};

    const { data: integration } = await supabase
      .from("integrations")
      .select("email_config")
      .eq("business_id", businessId)
      .eq("active", true)
      .maybeSingle();

    if (integration?.email_config) {
      emailConfig = integration.email_config as EmailConfig;
    }

    const platformBrevoKey = Deno.env.get("BREVO_API_KEY");
    const platformSendGridKey = Deno.env.get("SENDGRID_API_KEY");
    const platformFromEmail = Deno.env.get("EMAIL_FROM");
    const platformFromName = Deno.env.get("EMAIL_FROM_NAME");

    const brevoApiKey = emailConfig.brevoApiKey || platformBrevoKey;
    const sendgridApiKey = emailConfig.sendgridApiKey || platformSendGridKey;
    const fromEmail = emailConfig.fromEmail || platformFromEmail;
    const fromName = emailConfig.fromName || platformFromName;

    const useBrevo = !!brevoApiKey;
    const useSendGrid = !!sendgridApiKey;

    if ((!useBrevo && !useSendGrid) || !fromEmail || !fromName) {
      return new Response(
        JSON.stringify({ error: "Email configuration not found. Please configure Brevo or SendGrid credentials." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const trackingToken = crypto.randomUUID();

    let htmlBody = body.includes("<html") || body.includes("<body") || body.includes("<p>")
      ? body
      : convertPlainTextToHtml(body);

    if (business.email_tracking_enabled) {
      htmlBody = injectTrackingPixel(htmlBody, trackingToken, supabaseUrl);
    }

    const sendResult = useBrevo
      ? await sendEmailViaBrevo(
          brevoApiKey!,
          fromEmail,
          fromName,
          recipientEmail,
          recipientName,
          subject,
          htmlBody
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

    const { error: logError } = await supabase
      .from("communication_logs")
      .insert({
        business_id: businessId,
        customer_id: customerId || null,
        type: "email",
        template_id: templateId || null,
        template_name: templateName || null,
        subject: subject,
        content: body,
        status: sendResult.success ? "sent" : "failed",
        error_message: sendResult.error || null,
        tracking_token: business.email_tracking_enabled ? trackingToken : null,
        provider: useBrevo ? "brevo" : "sendgrid",
        provider_message_id: sendResult.messageId || null,
        metadata: {
          recipient_email: recipientEmail,
          recipient_name: recipientName,
          from_email: fromEmail,
          from_name: fromName,
        },
      });

    if (logError) {
      console.error("Error logging email:", logError);
    }

    if (sendResult.success) {
      await supabase.rpc("increment_business_usage", {
        p_business_id: businessId,
        p_column_name: "usage_email_monthly",
      });
    }

    return new Response(
      JSON.stringify({
        success: sendResult.success,
        messageId: sendResult.messageId,
        trackingToken: business.email_tracking_enabled ? trackingToken : null,
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