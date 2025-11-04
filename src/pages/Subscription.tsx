import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { redirectToCheckout, redirectToPortal } from '../lib/stripe';
import Sidebar from '../components/Sidebar';
import SubscriptionCard from '../components/SubscriptionCard';
import { CreditCard, Calendar, AlertCircle, ExternalLink } from 'lucide-react';

interface SubscriptionTier {
  id: string;
  name: string;
  max_customers: number;
  max_programs: number;
  max_sms_monthly: number;
  price_monthly: number;
  stripe_price_id: string | null;
  features: Record<string, boolean>;
}

interface StripeCustomer {
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  payment_method_status: string;
}

export default function Subscription() {
  const { business } = useAuth();
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [stripeCustomer, setStripeCustomer] = useState<StripeCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [business]);

  const loadData = async () => {
    if (!business) return;

    try {
      const [tiersResult, customerResult] = await Promise.all([
        supabase
          .from('subscription_tiers')
          .select('*')
          .order('price_monthly', { ascending: true }),
        supabase
          .from('stripe_customers')
          .select('*')
          .eq('business_id', business.id)
          .maybeSingle(),
      ]);

      if (tiersResult.data) {
        setTiers(tiersResult.data);
      }

      if (customerResult.data) {
        setStripeCustomer(customerResult.data);
      }
    } catch (err) {
      console.error('Error loading subscription data:', err);
      setError('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handleTierSelect = async (tier: SubscriptionTier) => {
    if (!tier.stripe_price_id) {
      setError('This tier is not available for purchase');
      return;
    }

    if (tier.price_monthly === 0) {
      setError('Please use the billing portal to cancel your subscription');
      return;
    }

    try {
      setError('');
      await redirectToCheckout(tier.stripe_price_id);
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
    }
  };

  const handleManageBilling = async () => {
    try {
      setError('');
      await redirectToPortal();
    } catch (err) {
      console.error('Portal error:', err);
      setError(err instanceof Error ? err.message : 'Failed to open billing portal');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const currentTier = tiers.find(t => t.id === business?.tier_id);
  const hasActiveSubscription = stripeCustomer?.stripe_subscription_id;

  return (
    <div className="min-h-screen bg-black flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 p-8 lg:ml-64">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Subscription & Billing</h1>
            <p className="text-gray-400">Manage your subscription plan and billing information</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Current Plan</p>
                  <p className="text-lg font-bold text-white">
                    {currentTier?.name || 'Free'}
                  </p>
                </div>
              </div>
              <p className="text-2xl font-bold text-white">
                ${currentTier?.price_monthly || 0}
                <span className="text-sm text-gray-400 font-normal">/month</span>
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Billing Period</p>
                  <p className="text-lg font-bold text-white">
                    {business?.subscription_status === 'active' ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-400">
                Renews on {formatDate(business?.subscription_period_end || null)}
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Payment Status</p>
                  <p className="text-lg font-bold text-white capitalize">
                    {stripeCustomer?.payment_method_status || 'No payment method'}
                  </p>
                </div>
              </div>
              {hasActiveSubscription && (
                <button
                  onClick={handleManageBilling}
                  className="text-sm text-orange-400 hover:text-orange-300 transition flex items-center gap-1"
                >
                  Manage billing
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">Available Plans</h2>
            <p className="text-gray-400 mb-6">
              Choose the plan that best fits your business needs. Upgrade or downgrade at any time.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tiers.map((tier) => (
                <SubscriptionCard
                  key={tier.id}
                  tier={tier}
                  currentTierId={business?.tier_id}
                  currentStripePriceId={business?.stripe_price_id || undefined}
                  onSelect={handleTierSelect}
                />
              ))}
            </div>
          )}

          {hasActiveSubscription && (
            <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Need Help?</h3>
              <p className="text-gray-400 mb-4">
                You can manage your subscription, update payment methods, view invoices, and cancel your
                subscription through the Stripe Customer Portal.
              </p>
              <button
                onClick={handleManageBilling}
                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition flex items-center gap-2"
              >
                Open Billing Portal
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
