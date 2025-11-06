import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { UserPlus, Check, AlertCircle, Loader } from 'lucide-react';

interface InvitationData {
  id: string;
  tenant_id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  company_name: string;
}

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signUp, signIn } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [acceptingInvitation, setAcceptingInvitation] = useState(false);
  const [hasExistingAccount, setHasExistingAccount] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      loadInvitation(token);
    } else {
      setError('Invalid invitation link');
      setLoading(false);
    }
  }, [searchParams]);

  const loadInvitation = async (token: string) => {
    try {
      const { data, error } = await supabase
        .from('tenant_invitations')
        .select(`
          id,
          tenant_id,
          email,
          role,
          status,
          expires_at
        `)
        .eq('token', token)
        .maybeSingle();

      if (error || !data) {
        setError('Invitation not found');
        setLoading(false);
        return;
      }

      if (data.status !== 'pending') {
        setError('This invitation has already been used or revoked');
        setLoading(false);
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setError('This invitation has expired');
        setLoading(false);
        return;
      }

      // Get tenant information
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('company_name')
        .eq('id', data.tenant_id)
        .maybeSingle();

      setInvitation({
        ...data,
        company_name: tenantData?.company_name || 'Unknown Company',
      });
    } catch (err) {
      console.error('Error loading invitation:', err);
      setError('Failed to load invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccountAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;

    setAcceptingInvitation(true);
    setError('');

    try {
      // Create new account
      const { error: signUpError } = await signUp(
        invitation.email,
        password,
        `${firstName} ${lastName}`.trim() || invitation.email.split('@')[0],
        '' // We'll set tier from existing tenant
      );

      if (signUpError) {
        throw signUpError;
      }

      // Wait a moment for the account to be created
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get the new user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Failed to create session');
      }

      // Accept the invitation
      await acceptInvitationForUser(session.user.id);
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
      setAcceptingInvitation(false);
    }
  };

  const handleLoginAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;

    setLoggingIn(true);
    setError('');

    try {
      const { error: signInError } = await signIn(loginEmail, loginPassword);

      if (signInError) {
        throw signInError;
      }

      // Wait a moment for the session to be established
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get the current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Failed to establish session');
      }

      // Verify email matches invitation
      if (session.user.email !== invitation.email) {
        throw new Error(`Please log in with the invited email address: ${invitation.email}`);
      }

      // Accept the invitation
      await acceptInvitationForUser(session.user.id);
    } catch (err) {
      console.error('Error logging in:', err);
      setError(err instanceof Error ? err.message : 'Failed to log in');
      setLoggingIn(false);
    }
  };

  const acceptInvitationForUser = async (userId: string) => {
    if (!invitation) return;

    try {
      // Update business record with tenant information
      const { data: businessData } = await supabase
        .from('businesses')
        .select('id, tenant_id')
        .eq('id', userId)
        .maybeSingle();

      if (businessData) {
        // Update existing business with tenant
        await supabase
          .from('businesses')
          .update({
            tenant_id: invitation.tenant_id,
            is_tenant_admin: false,
          })
          .eq('id', userId);
      }

      // Create tenant member record
      const { error: memberError } = await supabase
        .from('tenant_members')
        .insert({
          tenant_id: invitation.tenant_id,
          user_id: userId,
          role: invitation.role,
          status: 'active',
          accepted_at: new Date().toISOString(),
        });

      if (memberError) {
        console.error('Error creating tenant member:', memberError);
        throw memberError;
      }

      // Mark invitation as accepted
      await supabase
        .from('tenant_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id);

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Error accepting invitation:', err);
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Invitation</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl mb-4">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Team Invitation</h1>
          <p className="text-gray-400">You've been invited to join {invitation?.company_name}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="mb-6 bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium mb-1">Invitation Details</p>
                <p className="text-sm text-gray-400">Email: {invitation?.email}</p>
                <p className="text-sm text-gray-400">Role: {invitation?.role}</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex gap-2 border-b border-zinc-800">
              <button
                onClick={() => setHasExistingAccount(false)}
                className={`flex-1 py-3 text-sm font-medium transition ${
                  !hasExistingAccount
                    ? 'text-orange-400 border-b-2 border-orange-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Create Account
              </button>
              <button
                onClick={() => setHasExistingAccount(true)}
                className={`flex-1 py-3 text-sm font-medium transition ${
                  hasExistingAccount
                    ? 'text-orange-400 border-b-2 border-orange-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Sign In
              </button>
            </div>
          </div>

          {!hasExistingAccount ? (
            <form onSubmit={handleCreateAccountAndAccept} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email (Pre-filled)
                </label>
                <input
                  type="email"
                  value={invitation?.email}
                  disabled
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-gray-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                  placeholder="••••••••"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
              </div>

              <button
                type="submit"
                disabled={acceptingInvitation}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition"
              >
                {acceptingInvitation ? 'Accepting Invitation...' : 'Accept & Create Account'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLoginAndAccept} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                  placeholder={invitation?.email}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Must match the invited email: {invitation?.email}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loggingIn}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition"
              >
                {loggingIn ? 'Signing In...' : 'Sign In & Accept Invitation'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
