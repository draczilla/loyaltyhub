import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';
import {
  Menu, Building2, Users, Mail, AlertCircle, Check,
  UserPlus, Trash2, RefreshCw, XCircle, Crown, User,
  CheckCircle, Shield, Smartphone, Loader
} from 'lucide-react';

interface TenantMember {
  id: string;
  user_id: string;
  role: string;
  status: string;
  invited_at: string;
  accepted_at: string | null;
  email: string;
  company_name: string;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
}

interface SeatInfo {
  currentSeats: number;
  maxSeats: number;
  percentage: number;
}

export default function CompanyProfile() {
  const { business, tenant, isTenantAdmin, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [seatInfo, setSeatInfo] = useState<SeatInfo>({ currentSeats: 0, maxSeats: 1, percentage: 0 });
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [sendingEmailVerification, setSendingEmailVerification] = useState(false);
  const [sendingPhoneVerification, setSendingPhoneVerification] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [creditsEligibility, setCreditsEligibility] = useState<any>(null);

  useEffect(() => {
    if (business && !tenant) {
      // User doesn't have a tenant yet - create one
      createTenantForExistingUser();
    } else if (tenant && business) {
      loadTeamData();
      loadCreditsEligibility();
    }
  }, [tenant, business]);

  const createTenantForExistingUser = async () => {
    if (!business) return;

    setLoading(true);
    try {
      // Create tenant for existing user
      const { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          company_name: business.company_name,
          admin_user_id: business.id,
        })
        .select()
        .single();

      if (tenantError) throw tenantError;

      // Update business with tenant_id
      const { error: updateError } = await supabase
        .from('businesses')
        .update({
          tenant_id: newTenant.id,
          is_tenant_admin: true,
        })
        .eq('id', business.id);

      if (updateError) throw updateError;

      // Create tenant member record
      await supabase.from('tenant_members').insert({
        tenant_id: newTenant.id,
        user_id: business.id,
        role: 'admin',
        status: 'active',
        accepted_at: new Date().toISOString(),
      });

      // Force auth context to reload by refetching session
      if (user) {
        // Small delay to ensure database writes are complete
        await new Promise(resolve => setTimeout(resolve, 500));
        window.location.reload();
      }
    } catch (err) {
      console.error('Error creating tenant:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize company profile');
      setLoading(false);
    }
  };

  const loadCreditsEligibility = async () => {
    if (!business) return;

    try {
      const { data, error } = await supabase.rpc('check_credits_eligibility', {
        p_business_id: business.id,
      });

      if (error) throw error;
      setCreditsEligibility(data?.[0] || null);
    } catch (err) {
      console.error('Error checking credits eligibility:', err);
    }
  };

  const handleSendEmailVerification = async () => {
    if (!business) return;

    setSendingEmailVerification(true);
    setError('');
    setSuccess('');

    try {
      const { data: tierData } = await supabase
        .from('subscription_tiers')
        .select('name')
        .eq('id', business.tier_id)
        .maybeSingle();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-welcome-verification`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            businessId: business.id,
            email: business.email,
            companyName: business.company_name,
            tierName: tierData?.name || 'Free',
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to send verification email');
      }

      setSuccess('Verification email sent! Please check your inbox.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification email');
    } finally {
      setSendingEmailVerification(false);
    }
  };

  const handleSendPhoneVerification = async () => {
    if (!business || !phoneNumber) return;

    setSendingPhoneVerification(true);
    setError('');
    setSuccess('');

    try {
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber}`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-phone-verification`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            businessId: business.id,
            phone: formattedPhone,
            companyName: business.company_name,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to send verification SMS');
      }

      setSuccess('Verification SMS sent! Please check your phone.');
      setShowPhoneInput(false);
      setPhoneNumber('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification SMS');
    } finally {
      setSendingPhoneVerification(false);
    }
  };

  const loadTeamData = async () => {
    if (!tenant || !business) return;

    setLoading(true);
    try {
      // Load team members
      const { data: membersData, error: membersError } = await supabase
        .from('tenant_members')
        .select(`
          id,
          user_id,
          role,
          status,
          invited_at,
          accepted_at
        `)
        .eq('tenant_id', tenant.id)
        .eq('status', 'active')
        .order('invited_at', { ascending: false });

      if (membersError) throw membersError;

      // Get business details for each member
      const enrichedMembers: TenantMember[] = [];
      if (membersData) {
        for (const member of membersData) {
          const { data: businessData } = await supabase
            .from('businesses')
            .select('email, company_name')
            .eq('id', member.user_id)
            .maybeSingle();

          enrichedMembers.push({
            ...member,
            email: businessData?.email || '',
            company_name: businessData?.company_name || '',
          });
        }
      }

      setMembers(enrichedMembers);

      // Load pending invitations
      if (isTenantAdmin) {
        const { data: invitationsData, error: invitationsError } = await supabase
          .from('tenant_invitations')
          .select('*')
          .eq('tenant_id', tenant.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (invitationsError) throw invitationsError;
        setInvitations(invitationsData || []);
      }

      // Get seat information
      const { data: tierData } = await supabase
        .from('subscription_tiers')
        .select('features')
        .eq('id', business.tier_id)
        .maybeSingle();

      const maxSeats = tierData?.features?.max_seats || 1;
      const currentSeats = enrichedMembers.length;
      const percentage = (currentSeats / maxSeats) * 100;

      setSeatInfo({ currentSeats, maxSeats, percentage });
    } catch (err) {
      console.error('Error loading team data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    setInviting(true);
    setError('');
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-team-invitation`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: tenant.id,
          email: inviteEmail,
          role: 'member',
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send invitation');
      }

      setSuccess('Invitation sent successfully!');
      setInviteEmail('');
      setShowInviteModal(false);
      loadTeamData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;

    try {
      const { error } = await supabase
        .from('tenant_invitations')
        .update({ status: 'revoked' })
        .eq('id', invitationId);

      if (error) throw error;

      setSuccess('Invitation revoked successfully');
      loadTeamData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke invitation');
    }
  };

  const handleResendInvitation = async (invitation: PendingInvitation) => {
    try {
      // Revoke old invitation
      await supabase
        .from('tenant_invitations')
        .update({ status: 'revoked' })
        .eq('id', invitation.id);

      // Send new invitation
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-team-invitation`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: tenant?.id,
          email: invitation.email,
          role: invitation.role,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to resend invitation');
      }

      setSuccess('Invitation resent successfully!');
      loadTeamData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend invitation');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the team?`)) return;

    try {
      const { error } = await supabase
        .from('tenant_members')
        .update({ status: 'inactive' })
        .eq('id', memberId);

      if (error) throw error;

      setSuccess('Member removed successfully');
      loadTeamData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-black flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-h-screen lg:ml-64">
        <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden text-gray-400 hover:text-white transition"
                >
                  <Menu className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">Company Profile</h1>
                    <p className="text-gray-400 text-sm mt-1">Manage your team and company settings</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
              <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-start gap-3">
              <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-green-400 text-sm">{success}</p>
              </div>
              <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-300">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">Setting up your company profile...</p>
              </div>
            </div>
          ) : !tenant ? (
            <div className="max-w-2xl mx-auto">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6 text-center">
                <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Company Profile Not Available</h3>
                <p className="text-gray-400 mb-4">
                  Your account needs to be migrated to the new company profile system.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition"
                >
                  Retry Setup
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Verification Status Card */}
              <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                    <Shield className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Account Verification</h2>
                    <p className="text-sm text-gray-400">Complete verification to unlock communication features and credits</p>
                  </div>
                </div>

                {/* Verification Progress */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Email Verification */}
                  <div className={`p-4 rounded-lg border-2 ${
                    business?.email_verified
                      ? 'bg-green-500/5 border-green-500/20'
                      : 'bg-zinc-800 border-zinc-700'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Mail className={`w-5 h-5 ${business?.email_verified ? 'text-green-400' : 'text-gray-400'}`} />
                        <span className="font-medium text-white">Email Verification</span>
                      </div>
                      {business?.email_verified ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{business?.email}</p>
                    {business?.email_verified ? (
                      <div className="flex items-center gap-2 text-sm text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        <span>Verified</span>
                      </div>
                    ) : (
                      <button
                        onClick={handleSendEmailVerification}
                        disabled={sendingEmailVerification}
                        className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition flex items-center justify-center gap-2"
                      >
                        {sendingEmailVerification ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          'Send Verification Email'
                        )}
                      </button>
                    )}
                  </div>

                  {/* Phone Verification */}
                  <div className={`p-4 rounded-lg border-2 ${
                    business?.phone_verified
                      ? 'bg-green-500/5 border-green-500/20'
                      : 'bg-zinc-800 border-zinc-700'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Smartphone className={`w-5 h-5 ${business?.phone_verified ? 'text-green-400' : 'text-gray-400'}`} />
                        <span className="font-medium text-white">Phone Verification</span>
                      </div>
                      {business?.phone_verified ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                    {business?.phone_verified ? (
                      <>
                        <p className="text-sm text-gray-400 mb-3">{business?.phone || 'Phone verified'}</p>
                        <div className="flex items-center gap-2 text-sm text-green-400">
                          <CheckCircle className="w-4 h-4" />
                          <span>Verified</span>
                        </div>
                      </>
                    ) : showPhoneInput ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <div className="w-16 px-2 py-2 bg-black border border-zinc-700 rounded text-white text-center text-sm">
                            +1
                          </div>
                          <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                            placeholder="5551234567"
                            className="flex-1 px-3 py-2 bg-black border border-zinc-700 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:border-orange-500"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowPhoneInput(false)}
                            className="flex-1 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-sm transition"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSendPhoneVerification}
                            disabled={sendingPhoneVerification || !phoneNumber || phoneNumber.length < 10}
                            className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm transition flex items-center justify-center gap-2"
                          >
                            {sendingPhoneVerification ? (
                              <>
                                <Loader className="w-4 h-4 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              'Send SMS'
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-400 mb-3">Not verified</p>
                        <button
                          onClick={() => setShowPhoneInput(true)}
                          className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition"
                        >
                          Verify Phone Number
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Credits Status */}
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-white">Communication Credits</h3>
                    <span className="text-2xl font-bold text-orange-400">{business?.credits_remaining || 0}</span>
                  </div>
                  {creditsEligibility && (
                    <div className="space-y-2">
                      {creditsEligibility.eligible ? (
                        <div className="flex items-center gap-2 text-sm text-green-400">
                          <CheckCircle className="w-4 h-4" />
                          <span>{creditsEligibility.reason}</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-yellow-400">
                            <AlertCircle className="w-4 h-4" />
                            <span>{creditsEligibility.reason}</span>
                          </div>
                          {creditsEligibility.reason.includes('subscription') && (
                            <button
                              onClick={() => window.location.href = '/subscription'}
                              className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm transition"
                            >
                              View Subscription Plans
                            </button>
                          )}
                        </div>
                      )}
                      {business?.email_verified && business?.phone_verified && creditsEligibility.eligible && (
                        <p className="text-xs text-gray-500">
                          Credits will be used for SMS and email communications
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Company Information */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Company Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Company Name</label>
                    <p className="text-white">{tenant?.company_name || business?.company_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Admin Email</label>
                    <p className="text-white">{business?.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Created</label>
                    <p className="text-white">{formatDate(tenant?.created_at || '')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Subscription</label>
                    <p className="text-white capitalize">{business?.subscription_status || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Seat Usage */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">Seat Usage</h2>
                    <p className="text-gray-400 text-sm mt-1">
                      {seatInfo.currentSeats} of {seatInfo.maxSeats} seats used
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-white">{Math.round(seatInfo.percentage)}%</p>
                    <p className="text-sm text-gray-400">Capacity</p>
                  </div>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      seatInfo.percentage >= 100
                        ? 'bg-red-500'
                        : seatInfo.percentage >= 80
                        ? 'bg-yellow-500'
                        : 'bg-orange-500'
                    }`}
                    style={{ width: `${Math.min(seatInfo.percentage, 100)}%` }}
                  ></div>
                </div>
                {seatInfo.percentage >= 100 && (
                  <div className="mt-4 flex items-center justify-between p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-400" />
                      <p className="text-yellow-400 text-sm">
                        You've reached your seat limit. Upgrade your plan to invite more team members.
                      </p>
                    </div>
                    <button
                      onClick={() => window.location.href = '/subscription'}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition whitespace-nowrap"
                    >
                      Upgrade Plan
                    </button>
                  </div>
                )}
              </div>

              {/* Team Members */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Team Members ({members.length})
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">Active members in your organization</p>
                  </div>
                  {isTenantAdmin && seatInfo.currentSeats < seatInfo.maxSeats && (
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition"
                    >
                      <UserPlus className="w-4 h-4" />
                      Invite Member
                    </button>
                  )}
                </div>

                {members.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No team members yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 bg-black border border-zinc-700 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                            {member.role === 'admin' ? (
                              <Crown className="w-5 h-5 text-orange-400" />
                            ) : (
                              <User className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-white font-medium">{member.company_name || member.email}</p>
                              {member.role === 'admin' && (
                                <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 text-xs rounded border border-orange-500/20">
                                  Admin
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-400">{member.email}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Joined {formatDate(member.accepted_at || member.invited_at)}
                            </p>
                          </div>
                        </div>
                        {isTenantAdmin && member.user_id !== business?.id && (
                          <button
                            onClick={() => handleRemoveMember(member.id, member.company_name || member.email)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition"
                            title="Remove member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending Invitations */}
              {isTenantAdmin && invitations.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <h2 className="text-xl font-bold text-white mb-4">Pending Invitations ({invitations.length})</h2>
                  <div className="space-y-3">
                    {invitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="flex items-center justify-between p-4 bg-black border border-zinc-700 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                            <Mail className="w-5 h-5 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{invitation.email}</p>
                            <p className="text-sm text-gray-400">
                              Sent {formatDate(invitation.created_at)} • Expires {formatDate(invitation.expires_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleResendInvitation(invitation)}
                            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition"
                            title="Resend invitation"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRevokeInvitation(invitation.id)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition"
                            title="Revoke invitation"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-white mb-4">Invite Team Member</h2>
            <form onSubmit={handleInviteMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                  placeholder="colleague@example.com"
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  They'll receive an email with a link to join your team
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmail('');
                  }}
                  className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition"
                >
                  {inviting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
