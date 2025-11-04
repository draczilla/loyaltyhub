import { Check, Loader2 } from 'lucide-react';
import { useState } from 'react';

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

interface SubscriptionCardProps {
  tier: SubscriptionTier;
  currentTierId?: string;
  currentStripePriceId?: string;
  onSelect: (tier: SubscriptionTier) => Promise<void>;
  disabled?: boolean;
}

export default function SubscriptionCard({
  tier,
  currentTierId,
  currentStripePriceId,
  onSelect,
  disabled = false,
}: SubscriptionCardProps) {
  const [loading, setLoading] = useState(false);

  const isCurrentTier = tier.id === currentTierId || tier.stripe_price_id === currentStripePriceId;
  const isFree = tier.price_monthly === 0;

  const handleSelect = async () => {
    if (isCurrentTier || disabled || loading) return;

    setLoading(true);
    try {
      await onSelect(tier);
    } catch (error) {
      console.error('Failed to select tier:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`relative p-6 rounded-xl border-2 transition ${
        isCurrentTier
          ? 'border-orange-500 bg-orange-500/5'
          : 'border-zinc-700 bg-zinc-900 hover:border-zinc-600'
      }`}
    >
      {isCurrentTier && (
        <div className="absolute top-4 right-4">
          <span className="px-3 py-1 bg-orange-500 text-white text-xs font-medium rounded-full">
            Current Plan
          </span>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-white">
            ${tier.price_monthly}
          </span>
          <span className="text-gray-400">/month</span>
        </div>
      </div>

      <ul className="space-y-3 mb-6">
        <li className="flex items-start gap-2 text-gray-300">
          <Check className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <span>
            {tier.max_customers === -1 ? 'Unlimited' : tier.max_customers.toLocaleString()}{' '}
            customers
          </span>
        </li>
        <li className="flex items-start gap-2 text-gray-300">
          <Check className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <span>
            {tier.max_programs === -1 ? 'Unlimited' : tier.max_programs}{' '}
            loyalty programs
          </span>
        </li>
        <li className="flex items-start gap-2 text-gray-300">
          <Check className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <span>{tier.max_sms_monthly.toLocaleString()} SMS/month</span>
        </li>
        {tier.features.mailchimp && (
          <li className="flex items-start gap-2 text-orange-400">
            <Check className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <span>MailChimp integration</span>
          </li>
        )}
        {tier.features.white_label && (
          <li className="flex items-start gap-2 text-orange-400">
            <Check className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <span>White-label branding</span>
          </li>
        )}
        {tier.features.priority_support && (
          <li className="flex items-start gap-2 text-orange-400">
            <Check className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <span>Priority support</span>
          </li>
        )}
      </ul>

      <button
        onClick={handleSelect}
        disabled={isCurrentTier || disabled || loading}
        className={`w-full py-3 rounded-lg font-medium transition ${
          isCurrentTier
            ? 'bg-zinc-800 text-gray-400 cursor-not-allowed'
            : isFree
            ? 'bg-zinc-800 hover:bg-zinc-700 text-white'
            : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white'
        } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : isCurrentTier ? (
          'Current Plan'
        ) : isFree ? (
          'Downgrade'
        ) : (
          'Upgrade'
        )}
      </button>
    </div>
  );
}
