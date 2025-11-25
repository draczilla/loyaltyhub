import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InvitationRequest {
  tenantId: string;
  email: string;
  role?: string;
}

interface EmailConfig {
  sendgridApiKey?: string;
  fromEmail?: string;
  fromName?: string;
}

async function sendInvitationEmail(
  apiKey: string,
  fromEmail: string,
  fromName: string,
  toEmail: string,
  companyName: string,
  invitationUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="display: inline-block; background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); padding: 16px; border-radius: 12px; margin-bottom: 20px;">
        <span style="font-size: 32px; color: white;">🎯</span>
      </div>
      <h1 style="color: #1a1a1a; margin: 0; font-size: 28px;">Team Invitation</h1>
    </div>
    
    <div style="margin-bottom: 30px;">
      <p style="font-size: 16px; color: #555; margin-bottom: 20px;">
        You've been invited to join <strong style="color: #ff6b35;">${companyName}</strong> on LoyaltyHub!
      </p>
      
      <p style="font-size: 16px; color: #555; margin-bottom: 30px;">
        LoyaltyHub is a powerful loyalty platform that helps businesses create and manage customer loyalty programs. As a team member, you'll have access to:
      </p>
      
      <ul style="list-style: none; padding: 0; margin-bottom: 30px;">
        <li style="padding: 10px 0; border-bottom: 1px solid #eee;">
          <span style="color: #ff6b35; margin-right: 10px;">✓</span>
          Customer management and engagement tools
        </li>
        <li style="padding: 10px 0; border-bottom: 1px solid #eee;">
          <span style="color: #ff6b35; margin-right: 10px;">✓</span>
          Loyalty program creation and tracking
        </li>
        <li style="padding: 10px 0; border-bottom: 1px solid #eee;">
          <span style="color: #ff6b35; margin-right: 10px;">✓</span>
          SMS and email campaign management
        </li>
        <li style="padding: 10px 0;">
          <span style="color: #ff6b35; margin-right: 10px;">✓</span>
          Analytics and reporting dashboard
        </li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 40px 0;">
      <a href="${invitationUrl}" style="display: inline-block; background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(255, 107, 53, 0.3);">
        Accept Invitation & Join Team
      </a>
    </div>
    
    <div style="background-color: #f9f9f9; border-left: 4px solid #ff6b35; padding: 15px; border-radius: 4px; margin: 30px 0;">
      <p style="margin: 0; color: #666; font-size: 14px;">
        <strong>Note:</strong> This invitation link will expire in 7 days. If you don't have an account yet, you'll be able to create one during the acceptance process.
      </p>
    </div>
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px;">
      <p style="margin: 5px 0;">This is an automated email from LoyaltyHub</p>
      <p style="margin: 5px 0;">If you didn't expect this invitation, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: toEmail }],
            subject: `You've been invited to join ${companyName} on LoyaltyHub`,
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

    return { success: true };
  } catch (error) {
    console.error("Error sending invitation email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
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

    const invitationRequest: InvitationRequest = await req.json();
    const { tenantId, email, role = "member" } = invitationRequest;

    if (!tenantId || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: tenantId and email" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify user is tenant admin
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id, company_name, admin_user_id")
      .eq("id", tenantId)
      .maybeSingle();

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: "Tenant not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (tenant.admin_user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Only tenant admins can send invitations" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if seat limit allows invitation
    const { data: canInvite, error: seatCheckError } = await supabase
      .rpc("can_invite_member", { tenant_uuid: tenantId });

    if (seatCheckError || !canInvite) {
      return new Response(
        JSON.stringify({ error: "Seat limit reached. Please upgrade your subscription to invite more members." }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check for existing invitation
    const { data: existingInvitation } = await supabase
      .from("tenant_invitations")
      .select("id, status")
      .eq("tenant_id", tenantId)
      .eq("email", email)
      .eq("status", "pending")
      .maybeSingle();

    if (existingInvitation) {
      return new Response(
        JSON.stringify({ error: "An invitation has already been sent to this email address" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if user is already a member
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser?.users?.find(u => u.email === email);
    
    if (userExists) {
      const { data: existingMember } = await supabase
        .from("tenant_members")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("user_id", userExists.id)
        .eq("status", "active")
        .maybeSingle();

      if (existingMember) {
        return new Response(
          JSON.stringify({ error: "This user is already a member of your team" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Create invitation
    const { data: invitation, error: invitationError } = await supabase
      .from("tenant_invitations")
      .insert({
        tenant_id: tenantId,
        email: email,
        invited_by: user.id,
        role: role,
        status: "pending",
      })
      .select("id, token")
      .single();

    if (invitationError || !invitation) {
      console.error("Error creating invitation:", invitationError);
      return new Response(
        JSON.stringify({ error: "Failed to create invitation" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get email configuration
    let emailConfig: EmailConfig = {};

    const { data: integration } = await supabase
      .from("integrations")
      .select("email_config")
      .eq("business_id", user.id)
      .eq("active", true)
      .maybeSingle();

    if (integration?.email_config) {
      emailConfig = integration.email_config as EmailConfig;
    }

    const platformSendGridKey = Deno.env.get("SENDGRID_API_KEY");
    const platformFromEmail = Deno.env.get("EMAIL_FROM") || Deno.env.get("SENDGRID_FROM_EMAIL") || "noreply@loyaltyhub.com";
    const platformFromName = Deno.env.get("EMAIL_FROM_NAME") || Deno.env.get("SENDGRID_FROM_NAME") || "LoyaltyHub";

    const sendgridApiKey = emailConfig.sendgridApiKey || platformSendGridKey;
    const fromEmail = emailConfig.fromEmail || platformFromEmail;
    const fromName = emailConfig.fromName || platformFromName;

    if (!sendgridApiKey) {
      return new Response(
        JSON.stringify({ error: "Email configuration not found. Please configure SendGrid credentials." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Construct invitation URL
    const appUrl = Deno.env.get("APP_URL") || supabaseUrl.replace(".supabase.co", "").replace("https://", "https://") + ".vercel.app";
    const invitationUrl = `${appUrl}/accept-invitation?token=${invitation.token}`;

    // Send invitation email
    const emailResult = await sendInvitationEmail(
      sendgridApiKey,
      fromEmail,
      fromName,
      email,
      tenant.company_name,
      invitationUrl
    );

    if (!emailResult.success) {
      // Delete the invitation if email fails
      await supabase
        .from("tenant_invitations")
        .delete()
        .eq("id", invitation.id);

      return new Response(
        JSON.stringify({ error: `Failed to send invitation email: ${emailResult.error}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        invitationId: invitation.id,
        message: "Invitation sent successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-team-invitation:", error);
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
