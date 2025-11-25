// Diagnostic script to check communication logs
// Run this in your browser console on the Communications page

(async function diagnose() {
  console.log("=== COMMUNICATION LOGS DIAGNOSTIC ===");

  // Get the supabase client from window
  const supabase = window.supabase || await import('./src/lib/supabase.js').then(m => m.supabase);

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  console.log("1. Current User:", user?.id, userError);

  // Get business
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('id, tier_id, tenant_id')
    .eq('id', user?.id)
    .maybeSingle();
  console.log("2. Business:", business, businessError);

  // Check if user is a tenant member
  const { data: memberData, error: memberError } = await supabase
    .from('tenant_members')
    .select('tenant_id, role, status')
    .eq('user_id', user?.id)
    .eq('status', 'active')
    .maybeSingle();
  console.log("3. Tenant Membership:", memberData, memberError);

  // Get all communication logs (no business filter)
  const { data: allLogs, error: allLogsError } = await supabase
    .from('communication_logs')
    .select('id, business_id, type, status, created_at, is_test_email')
    .order('created_at', { ascending: false })
    .limit(20);
  console.log("4. All Communication Logs (recent 20):", allLogs, allLogsError);

  // Get logs for this business
  const businessId = business?.id;
  if (businessId) {
    const { data: myLogs, error: myLogsError } = await supabase
      .from('communication_logs')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(10);
    console.log("5. My Business Logs:", myLogs, myLogsError);
  }

  // Check RLS by calling user_has_business_access
  if (businessId) {
    const { data: hasAccess, error: accessError } = await supabase
      .rpc('user_has_business_access', { business_id: businessId });
    console.log("6. user_has_business_access result:", hasAccess, accessError);
  }

  console.log("=== END DIAGNOSTIC ===");
  console.log("Summary:");
  console.log("- User ID:", user?.id);
  console.log("- Business ID:", businessId);
  console.log("- Is Tenant Member:", !!memberData);
  console.log("- Total logs in system:", allLogs?.length || 0);
  console.log("- Your business logs:", businessId ? 'checked above' : 'no business found');
})();
