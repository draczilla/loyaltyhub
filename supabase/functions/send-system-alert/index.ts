import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SystemAlertRequest {
  type: 'sms_provider_switch' | 'email_provider_switch' | 'system_error' | 'balance_alert';
  from_provider?: string;
  to_provider?: string;
  error?: string;
  alert_email?: string;
  alert_phone?: string;
  metadata?: Record<string, any>;
  alert_data?: {
    title: string;
    message: string;
    severity: string;
    metadata?: Record<string, any>;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body: SystemAlertRequest = await req.json();
    const { type, from_provider, to_provider, error, alert_email, alert_phone, metadata, alert_data } = body;

    const timestamp = new Date().toISOString();
    const sentAlerts: string[] = [];
    const failedAlerts: string[] = [];

    if (alert_email) {
      try {
        let emailSubject = '';
        let emailBody = '';

        if (type === 'balance_alert' && alert_data) {
          const severityEmoji = alert_data.severity === 'critical' ? '🚨' : '⚠️';
          emailSubject = `${severityEmoji} LoyaltyHub: ${alert_data.title}`;

          const creditType = alert_data.metadata?.credit_type || 'unknown';
          const currentBalance = alert_data.metadata?.current_balance || 0;
          const threshold = alert_data.metadata?.threshold || 0;

          emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, ${alert_data.severity === 'critical' ? '#dc3545' : '#ffc107'} 0%, ${alert_data.severity === 'critical' ? '#c82333' : '#e0a800'} 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; margin: -30px -30px 20px -30px;">
      <h1 style="margin: 0; font-size: 24px;">${severityEmoji} ${alert_data.title}</h1>
    </div>

    <div style="background-color: ${alert_data.severity === 'critical' ? '#f8d7da' : '#fff3cd'}; border-left: 4px solid ${alert_data.severity === 'critical' ? '#dc3545' : '#ffc107'}; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
      <p style="margin: 0; color: ${alert_data.severity === 'critical' ? '#721c24' : '#856404'}; font-size: 16px;">${alert_data.message}</p>
    </div>

    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 4px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 15px 0; color: #495057;">Balance Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #dee2e6;"><strong>Credit Type:</strong></td>
          <td style="padding: 10px; border-bottom: 1px solid #dee2e6; text-align: right;">${creditType.toUpperCase()}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #dee2e6;"><strong>Current Balance:</strong></td>
          <td style="padding: 10px; border-bottom: 1px solid #dee2e6; text-align: right; color: ${alert_data.severity === 'critical' ? '#dc3545' : '#ffc107'}; font-weight: bold;">${currentBalance} credits</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #dee2e6;"><strong>Threshold:</strong></td>
          <td style="padding: 10px; border-bottom: 1px solid #dee2e6; text-align: right;">${threshold} credits</td>
        </tr>
        <tr>
          <td style="padding: 10px;"><strong>Alert Time:</strong></td>
          <td style="padding: 10px; text-align: right;">${new Date().toLocaleString()}</td>
        </tr>
      </table>
    </div>

    <div style="background-color: #e7f3ff; border-left: 4px solid #2196F3; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
      <h3 style="margin: 0 0 10px 0; color: #0c5460;">Recommended Actions</h3>
      <ul style="margin: 10px 0; padding-left: 20px; color: #0c5460;">
        <li>Check your Brevo account balance immediately</li>
        <li>Add credits to your Brevo account to prevent service interruption</li>
        <li>Review recent usage patterns and adjust thresholds if needed</li>
        <li>Consider upgrading your Brevo plan if you consistently hit limits</li>
      </ul>
    </div>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e9ecef;">
      <p style="margin: 5px 0; color: #6c757d; font-size: 14px;">This is an automated balance alert from LoyaltyHub.</p>
      <p style="margin: 5px 0; color: #6c757d; font-size: 14px;">Log in to your Super Admin dashboard to view detailed balance information.</p>
    </div>
  </div>
</body>
</html>
`;
        } else {
          emailSubject = `⚠️ LoyaltyHub System Alert: ${type.replace(/_/g, ' ').toUpperCase()}`;
          emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; margin: -30px -30px 20px -30px;">
      <h1 style="margin: 0; font-size: 24px;">⚠️ System Alert</h1>
    </div>

    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
      <h2 style="margin: 0 0 10px 0; color: #856404; font-size: 18px;">Alert Type: ${type.replace(/_/g, ' ').toUpperCase()}</h2>
      <p style="margin: 0; color: #856404;"><strong>Time:</strong> ${timestamp}</p>
    </div>
`;

        if (from_provider && to_provider) {
          emailBody += `
    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 10px 0; color: #495057;">Provider Switch Details</h3>
      <p style="margin: 5px 0;"><strong>From:</strong> <span style="color: #dc3545;">${from_provider.toUpperCase()}</span></p>
      <p style="margin: 5px 0;"><strong>To:</strong> <span style="color: #28a745;">${to_provider.toUpperCase()}</span></p>
    </div>
`;
        }

        emailBody += `
    <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
      <h3 style="margin: 0 0 10px 0; color: #721c24;">Error Details</h3>
      <p style="margin: 0; color: #721c24; font-family: 'Courier New', monospace; font-size: 13px; word-wrap: break-word;">${error}</p>
    </div>
`;

        if (metadata && Object.keys(metadata).length > 0) {
          emailBody += `
    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 10px 0; color: #495057;">Additional Information</h3>
      <pre style="background-color: #fff; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px;">${JSON.stringify(metadata, null, 2)}</pre>
    </div>
`;
        }

        emailBody += `
    <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e9ecef;">
      <p style="margin: 5px 0; color: #6c757d; font-size: 14px;">This is an automated system alert from LoyaltyHub.</p>
      <p style="margin: 5px 0; color: #6c757d; font-size: 14px;">Please investigate and resolve the issue as soon as possible.</p>
    </div>
  </div>
</body>
</html>
`;
        }

        const brevoApiKey = Deno.env.get("BREVO_API_KEY");
        const fromEmail = Deno.env.get("EMAIL_FROM") || "alerts@loyaltyhub.com";
        const fromName = Deno.env.get("EMAIL_FROM_NAME") || "LoyaltyHub Alerts";

        if (brevoApiKey) {
          const emailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
              "api-key": brevoApiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sender: {
                email: fromEmail,
                name: fromName,
              },
              to: [
                {
                  email: alert_email,
                  name: "System Administrator",
                },
              ],
              subject: emailSubject,
              htmlContent: emailBody,
            }),
          });

          if (emailResponse.ok) {
            sentAlerts.push(`Email sent to ${alert_email}`);
          } else {
            const errorText = await emailResponse.text();
            failedAlerts.push(`Email failed: ${errorText}`);
          }
        } else {
          failedAlerts.push("Email skipped: BREVO_API_KEY not configured");
        }
      } catch (emailError) {
        failedAlerts.push(`Email error: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`);
      }
    }

    if (alert_phone) {
      try {
        let smsMessage = '';

        if (type === 'balance_alert' && alert_data) {
          const severityEmoji = alert_data.severity === 'critical' ? '🚨' : '⚠️';
          const creditType = alert_data.metadata?.credit_type || 'unknown';
          const currentBalance = alert_data.metadata?.current_balance || 0;
          const threshold = alert_data.metadata?.threshold || 0;

          smsMessage = `${severityEmoji} LoyaltyHub: ${alert_data.title}\n`;
          smsMessage += `${creditType.toUpperCase()} credits: ${currentBalance} (threshold: ${threshold})\n`;
          smsMessage += `Check your dashboard immediately.`;
        } else {
          smsMessage = `⚠️ LoyaltyHub Alert: ${type.replace(/_/g, ' ')}\n`;

          if (from_provider && to_provider) {
            smsMessage += `Switched from ${from_provider} to ${to_provider}\n`;
          }

          if (error) {
            smsMessage += `Error: ${error.substring(0, 100)}${error.length > 100 ? '...' : ''}\n`;
          }

          smsMessage += `Time: ${new Date().toLocaleString()}`;
        }

        const brevoApiKey = Deno.env.get("BREVO_API_KEY");
        const brevoSender = Deno.env.get("BREVO_SMS_SENDER");

        if (brevoApiKey && brevoSender) {
          const smsResponse = await fetch("https://api.brevo.com/v3/transactionalSMS/sms", {
            method: "POST",
            headers: {
              "api-key": brevoApiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sender: brevoSender,
              recipient: alert_phone,
              content: smsMessage,
              type: "transactional",
            }),
          });

          if (smsResponse.ok) {
            sentAlerts.push(`SMS sent to ${alert_phone}`);
          } else {
            const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
            const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
            const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

            if (twilioSid && twilioToken && twilioPhone) {
              const credentials = btoa(`${twilioSid}:${twilioToken}`);

              const twilioResponse = await fetch(
                `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
                {
                  method: "POST",
                  headers: {
                    "Authorization": `Basic ${credentials}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                  },
                  body: new URLSearchParams({
                    To: alert_phone,
                    From: twilioPhone,
                    Body: smsMessage,
                  }),
                }
              );

              if (twilioResponse.ok) {
                sentAlerts.push(`SMS sent to ${alert_phone} via Twilio fallback`);
              } else {
                const errorText = await twilioResponse.text();
                failedAlerts.push(`SMS failed (Twilio): ${errorText}`);
              }
            } else {
              const errorText = await smsResponse.text();
              failedAlerts.push(`SMS failed (Brevo): ${errorText}`);
            }
          }
        } else {
          failedAlerts.push("SMS skipped: Brevo SMS credentials not configured");
        }
      } catch (smsError) {
        failedAlerts.push(`SMS error: ${smsError instanceof Error ? smsError.message : 'Unknown error'}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: sentAlerts.length > 0,
        sent: sentAlerts,
        failed: failedAlerts,
        timestamp: timestamp,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-system-alert function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
