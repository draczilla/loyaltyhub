import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CleanupRequest {
  mode: "detect" | "cleanup";
  userIds?: string[];
}

interface OrphanedUser {
  user_id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: superAdmin, error: superAdminError } = await supabase
      .from("super_admins")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (superAdminError || !superAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Super admin access required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { mode, userIds }: CleanupRequest = await req.json();

    if (mode !== "detect" && mode !== "cleanup") {
      return new Response(
        JSON.stringify({ error: "Invalid mode. Must be 'detect' or 'cleanup'" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (mode === "detect") {
      const { data: orphanedUsersData, error: detectError } = await supabase.rpc(
        "find_orphaned_auth_users"
      );

      if (detectError) {
        console.error("Error detecting orphaned users:", detectError);
        return new Response(
          JSON.stringify({
            error: "Failed to detect orphaned auth users",
            details: detectError.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const orphanedUsers = orphanedUsersData as OrphanedUser[];

      return new Response(
        JSON.stringify({
          success: true,
          mode: "detect",
          orphanedUsers: orphanedUsers || [],
          count: orphanedUsers?.length || 0,
          message: `Found ${orphanedUsers?.length || 0} orphaned auth user(s)`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (mode === "cleanup") {
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return new Response(
          JSON.stringify({
            error: "userIds array is required for cleanup mode",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const cleanupResults = {
        total: userIds.length,
        deleted: 0,
        failed: 0,
        errors: [] as Array<{ userId: string; error: string }>,
      };

      for (const userId of userIds) {
        try {
          const { data: businesses } = await supabase
            .from("businesses")
            .select("id")
            .eq("id", userId)
            .maybeSingle();

          if (businesses) {
            cleanupResults.failed++;
            cleanupResults.errors.push({
              userId,
              error: "User has corresponding business record - not orphaned",
            });
            continue;
          }

          const { data: superAdmins } = await supabase
            .from("super_admins")
            .select("id")
            .eq("id", userId)
            .maybeSingle();

          if (superAdmins) {
            cleanupResults.failed++;
            cleanupResults.errors.push({
              userId,
              error: "User is a super admin - cannot delete",
            });
            continue;
          }

          const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

          if (deleteError) {
            cleanupResults.failed++;
            cleanupResults.errors.push({
              userId,
              error: deleteError.message,
            });
            console.error(`Failed to delete auth user ${userId}:`, deleteError);
          } else {
            cleanupResults.deleted++;
            console.log(`Successfully deleted orphaned auth user ${userId}`);
          }
        } catch (error) {
          cleanupResults.failed++;
          cleanupResults.errors.push({
            userId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          console.error(`Error processing user ${userId}:`, error);
        }
      }

      return new Response(
        JSON.stringify({
          success: cleanupResults.deleted > 0,
          mode: "cleanup",
          results: cleanupResults,
          message: `Deleted ${cleanupResults.deleted} of ${cleanupResults.total} orphaned auth user(s)`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
