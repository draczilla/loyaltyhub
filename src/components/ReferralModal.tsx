import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  X, Copy, Check, Gift, Share2,
  Mail, Trophy, TrendingUp, Award, Users, MessageCircle
} from 'lucide-react';
import QRCode from 'qrcode';

interface ReferralModalProps {
  onClose: () => void;
}

interface ReferralCode {
  referral_code: string;
  total_referrals_completed: number;
  total_credits_earned: number;
  current_month_referrals: number;
}

interface Referral {
  id: string;
  referred_email: string;
  referral_status: string;
  credits_awarded: number | null;
  created_at: string;
}

interface Badge {
  badge_type: string;
  badge_name: string;
  referrals_required: number;
  bonus_credits_awarded: number;
  earned_at: string;
}

const BADGE_TIERS = [
  { type: 'bronze', name: 'Bronze Referrer', required: 1, credits: 25, color: 'from-amber-700 to-amber-900' },
  { type: 'silver', name: 'Silver Referrer', required: 2, credits: 50, color: 'from-gray-400 to-gray-600' },
  { type: 'gold', name: 'Gold Referrer', required: 3, credits: 75, color: 'from-yellow-400 to-yellow-600' },
  { type: 'platinum', name: 'Platinum Referrer', required: 4, credits: 100, color: 'from-cyan-400 to-cyan-600' },
  { type: 'diamond', name: 'Diamond Referrer', required: 5, credits: 150, color: 'from-purple-400 to-purple-600' },
];

const TIER_REWARDS = [
  { tier: 1, referrals: '1st', base: 50, bonus: 25, total: 75 },
  { tier: 2, referrals: '2nd', base: 50, bonus: 50, total: 100 },
  { tier: 3, referrals: '3rd', base: 50, bonus: 75, total: 125 },
  { tier: 4, referrals: '4th', base: 50, bonus: 100, total: 150 },
  { tier: 5, referrals: '5th', base: 50, bonus: 125, total: 175 },
];

export default function ReferralModal({ onClose }: ReferralModalProps) {
  const { business } = useAuth();
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showRules, setShowRules] = useState(false);

  const referralLink = referralCode
    ? `${window.location.origin}/signup?ref=${referralCode.referral_code}`
    : '';

  const loadReferralData = useCallback(async () => {
    if (!business) return;

    setLoading(true);

    try {
      const [codeResult, referralsResult, badgesResult] = await Promise.all([
        supabase
          .from('referral_codes')
          .select('*')
          .eq('business_id', business.id)
          .single(),
        supabase
          .from('referrals')
          .select('*')
          .eq('referrer_business_id', business.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('referral_badges')
          .select('*')
          .eq('business_id', business.id)
          .order('earned_at', { ascending: false }),
      ]);

      if (codeResult.data) setReferralCode(codeResult.data);
      if (referralsResult.data) setReferrals(referralsResult.data);
      if (badgesResult.data) setBadges(badgesResult.data);
    } catch (err) {
      console.error('Error loading referral data:', err);
    } finally {
      setLoading(false);
    }
  }, [business]);

  useEffect(() => {
    if (business) {
      loadReferralData();
    }
  }, [business, loadReferralData]);

  const generateQRCode = useCallback(async (url: string) => {
    try {
      const qr = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      setQrCodeUrl(qr);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  }, []);

  useEffect(() => {
    if (referralLink) {
      generateQRCode(referralLink);
    }
  }, [referralLink, generateQRCode]);

  const copyToClipboard = async (text: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent('Join LoyaltyHUB with my referral!');
    const body = encodeURIComponent(
      `Hey! I've been using LoyaltyHUB to manage my customer loyalty program and it's been great. Sign up using my referral code ${referralCode?.referral_code} and we both earn rewards!\n\nJoin here: ${referralLink}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const shareViaTwitter = () => {
    const text = encodeURIComponent(
      `Join me on LoyaltyHUB and we both earn rewards! Use my code: ${referralCode?.referral_code} ${referralLink}`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  const shareViaFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`, '_blank');
  };

  const shareViaLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`, '_blank');
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(
      `Hey! Join me on LoyaltyHUB using my referral code ${referralCode?.referral_code} and we both earn rewards! ${referralLink}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'credited': return 'text-green-400';
      case 'completed': return 'text-blue-400';
      case 'email_verified': return 'text-yellow-400';
      case 'phone_verified': return 'text-yellow-400';
      case 'signed_up': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'credited': return 'Credited';
      case 'completed': return 'Completed';
      case 'email_verified': return 'Email Verified';
      case 'phone_verified': return 'Phone Verified';
      case 'signed_up': return 'Signed Up';
      default: return 'Pending';
    }
  };

  const currentTierNumber = referralCode ? referralCode.current_month_referrals + 1 : 1;
  const progressPercentage = referralCode ? (referralCode.current_month_referrals / 5) * 100 : 0;
  const nextTierBonus = currentTierNumber <= 5 ? (currentTierNumber - 1) * 25 : 125;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
          <div className="text-center text-white">Loading referral data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto my-8">
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Gift className="w-7 h-7 text-orange-400" />
              Refer Friends & Earn Rewards
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Share your code and earn up to 625 credits per month + badge bonuses!
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-400" />
                <span className="text-gray-400 text-sm">Total Referrals</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {referralCode?.total_referrals_completed || 0}
              </p>
            </div>

            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <span className="text-gray-400 text-sm">Total Credits Earned</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {referralCode?.total_credits_earned || 0}
              </p>
            </div>

            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <span className="text-gray-400 text-sm">This Month</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {referralCode?.current_month_referrals || 0}/5
              </p>
            </div>

            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5 text-purple-400" />
                <span className="text-gray-400 text-sm">Next Tier Bonus</span>
              </div>
              <p className="text-2xl font-bold text-white">
                +{nextTierBonus}
              </p>
            </div>
          </div>

          {/* Referral Code Section */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Your Referral Code</h3>
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1 w-full">
                <div className="bg-zinc-900 border-2 border-orange-500/30 rounded-lg p-4 mb-3">
                  <div className="text-center">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">Referral Code</span>
                    <p className="text-3xl font-bold text-orange-400 tracking-widest mt-1">
                      {referralCode?.referral_code || 'LOADING...'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(referralCode?.referral_code || '', 'code')}
                  className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition flex items-center justify-center gap-2"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Code
                    </>
                  )}
                </button>
              </div>

              <div className="flex-1 w-full">
                <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 mb-3">
                  <p className="text-xs text-gray-400 mb-2">Shareable Link</p>
                  <p className="text-sm text-white break-all">{referralLink}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(referralLink, 'link')}
                  className="w-full px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition flex items-center justify-center gap-2"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </>
                  )}
                </button>
              </div>

              {qrCodeUrl && (
                <div className="bg-white p-3 rounded-lg">
                  <img src={qrCodeUrl} alt="QR Code" className="w-32 h-32" />
                  <p className="text-xs text-center text-gray-600 mt-2">Scan to Join</p>
                </div>
              )}
            </div>
          </div>

          {/* Social Sharing */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Share2 className="w-5 h-5 text-blue-400" />
              Share on Social Media
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <button
                onClick={shareViaEmail}
                className="px-4 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition flex items-center justify-center gap-2"
              >
                <Mail className="w-5 h-5" />
                Email
              </button>
              <button
                onClick={shareViaTwitter}
                className="px-4 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                Twitter
              </button>
              <button
                onClick={shareViaFacebook}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </button>
              <button
                onClick={shareViaLinkedIn}
                className="px-4 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn
              </button>
              <button
                onClick={shareViaWhatsApp}
                className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                WhatsApp
              </button>
            </div>
          </div>

          {/* Tier Progress */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Monthly Tier Progress</h3>
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">
                  {referralCode?.current_month_referrals || 0} of 5 referrals this month
                </span>
                <span className="text-orange-400 font-semibold">
                  Tier {currentTierNumber <= 5 ? currentTierNumber : 5}
                </span>
              </div>
              <div className="w-full bg-zinc-700 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-orange-500 to-orange-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
            <p className="text-sm text-gray-400">
              Next referral earns: <span className="text-white font-semibold">50 credits</span>
            </p>
          </div>

          {/* Rewards Breakdown */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Monthly Tier Rewards</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="text-left py-2 px-3 text-gray-400">Tier</th>
                    <th className="text-left py-2 px-3 text-gray-400">Referral</th>
                    <th className="text-left py-2 px-3 text-gray-400">Base Credits</th>
                    <th className="text-left py-2 px-3 text-gray-400">Tier Bonus</th>
                    <th className="text-left py-2 px-3 text-gray-400">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {TIER_REWARDS.map((reward) => (
                    <tr
                      key={reward.tier}
                      className={`border-b border-zinc-700/50 ${
                        currentTierNumber === reward.tier ? 'bg-orange-500/10' : ''
                      }`}
                    >
                      <td className="py-2 px-3 text-white font-semibold">Tier {reward.tier}</td>
                      <td className="py-2 px-3 text-gray-300">{reward.referrals}</td>
                      <td className="py-2 px-3 text-gray-300">{reward.base}</td>
                      <td className="py-2 px-3 text-orange-400">+{reward.bonus}</td>
                      <td className="py-2 px-3 text-white font-semibold">{reward.total}</td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td colSpan={4} className="py-2 px-3 text-gray-400">Monthly Total Potential</td>
                    <td className="py-2 px-3 text-orange-400">625 credits</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Badges */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-400" />
              Achievement Badges
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {BADGE_TIERS.map((tier) => {
                const earned = badges.find(b => b.badge_type === tier.type);
                const isEarned = !!earned;

                return (
                  <div
                    key={tier.type}
                    className={`relative p-4 rounded-lg border-2 transition ${
                      isEarned
                        ? 'border-transparent bg-gradient-to-br ' + tier.color
                        : 'border-zinc-700 bg-zinc-800/50 opacity-50'
                    }`}
                  >
                    <div className="text-center">
                      <div className={`w-16 h-16 mx-auto mb-2 rounded-full flex items-center justify-center ${
                        isEarned ? 'bg-white/20' : 'bg-zinc-700'
                      }`}>
                        <Trophy className="w-8 h-8" />
                      </div>
                      <p className="text-white font-semibold text-sm mb-1">{tier.name}</p>
                      <p className="text-xs text-gray-300">{tier.required} referral{tier.required > 1 ? 's' : ''}</p>
                      <p className="text-xs text-yellow-400 mt-1">+{tier.credits} credits</p>
                      {earned && (
                        <p className="text-xs text-white/80 mt-2">
                          Earned {new Date(earned.earned_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {isEarned && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-sm text-gray-400 mt-4 text-center">
              Total Badge Bonuses: <span className="text-white font-semibold">400 credits</span>
            </p>
          </div>

          {/* Recent Referrals */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Referrals</h3>
            {referrals.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No referrals yet. Share your code to get started!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="text-left py-2 px-3 text-gray-400">Date</th>
                      <th className="text-left py-2 px-3 text-gray-400">Email</th>
                      <th className="text-left py-2 px-3 text-gray-400">Status</th>
                      <th className="text-right py-2 px-3 text-gray-400">Credits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((referral) => (
                      <tr key={referral.id} className="border-b border-zinc-700/50">
                        <td className="py-2 px-3 text-gray-300">
                          {new Date(referral.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-3 text-gray-300">
                          {referral.referred_email.replace(/(.{3})(.*)(@.*)/, '$1***$3')}
                        </td>
                        <td className={`py-2 px-3 ${getStatusColor(referral.referral_status)}`}>
                          {getStatusText(referral.referral_status)}
                        </td>
                        <td className="py-2 px-3 text-right text-white font-semibold">
                          {referral.credits_awarded ? `+${referral.credits_awarded}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Rules & Requirements */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg">
            <button
              onClick={() => setShowRules(!showRules)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-zinc-800/50 transition"
            >
              <h3 className="text-lg font-semibold text-white">Rules & Requirements</h3>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${showRules ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showRules && (
              <div className="px-6 pb-6 space-y-3 text-sm text-gray-300">
                <div className="flex gap-2">
                  <span className="text-orange-400">•</span>
                  <p>Referred friend must be a new user to the platform</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-orange-400">•</span>
                  <p><strong>Both email AND phone verification are required</strong> for credit award</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-orange-400">•</span>
                  <p>Maximum of 5 credited referrals per month</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-orange-400">•</span>
                  <p>Tier bonuses reset monthly on the 1st of each month</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-orange-400">•</span>
                  <p>Achievement badges are permanent and awarded once</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-orange-400">•</span>
                  <p>Anti-fraud measures are in place to ensure fair use</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-orange-400">•</span>
                  <p>Self-referrals and fraudulent activity will result in credit forfeiture</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
