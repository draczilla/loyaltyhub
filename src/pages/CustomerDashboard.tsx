import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Award, Gift, TrendingUp, LogOut, Ticket, Percent, Sparkles, Clock } from 'lucide-react';

interface CustomerSession {
  customerId: string;
  businessId: string;
  name: string;
  phone: string;
}

interface ProgramProgress {
  id: string;
  program_id: string;
  points_balance: number;
  stamps_current: number;
  total_earned: number;
  last_activity_at: string;
  program: {
    name: string;
    type: string;
    config: any;
    status: string;
  };
}

interface CustomerReward {
  id: string;
  status: string;
  earned_at: string;
  redeemed_at: string | null;
  expires_at: string | null;
  redemption_code: string;
  reward: {
    name: string;
    description: string;
    type: string;
  };
  program: {
    name: string;
  };
}

const programTypeIcons = {
  points: Award,
  stamp_card: Ticket,
  rebate_code: Sparkles,
  discount: Percent,
  free_item: Gift
};

const programTypeColors = {
  points: 'from-orange-500 to-orange-600',
  stamp_card: 'from-blue-500 to-blue-600',
  rebate_code: 'from-green-500 to-green-600',
  discount: 'from-purple-500 to-purple-600',
  free_item: 'from-pink-500 to-pink-600'
};

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState<CustomerSession | null>(null);
  const [programs, setPrograms] = useState<ProgramProgress[]>([]);
  const [rewards, setRewards] = useState<CustomerReward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionData = sessionStorage.getItem('customer_session');
    if (!sessionData) {
      navigate('/customer/login');
      return;
    }

    const parsedSession = JSON.parse(sessionData);
    setSession(parsedSession);
    loadCustomerData(parsedSession.customerId);
  }, [navigate]);

  const loadCustomerData = async (customerId: string) => {
    setLoading(true);

    const [programsResult, rewardsResult] = await Promise.all([
      supabase
        .from('customer_program_progress')
        .select(`
          *,
          program:loyalty_programs(name, type, config, status)
        `)
        .eq('customer_id', customerId),
      supabase
        .from('customer_rewards')
        .select(`
          *,
          reward:rewards(name, description, type),
          program:loyalty_programs(name)
        `)
        .eq('customer_id', customerId)
        .order('earned_at', { ascending: false })
    ]);

    if (programsResult.data) {
      setPrograms(programsResult.data as any);
    }

    if (rewardsResult.data) {
      setRewards(rewardsResult.data as any);
    }

    setLoading(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('customer_session');
    navigate('/customer/login');
  };

  const getProgressPercentage = (program: ProgramProgress) => {
    if (program.program.type === 'points') {
      const minRedemption = program.program.config.minimumRedemption || 100;
      return Math.min((program.points_balance / minRedemption) * 100, 100);
    } else if (program.program.type === 'stamp_card') {
      const required = program.program.config.stampsRequired || 10;
      return (program.stamps_current / required) * 100;
    }
    return 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your rewards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black">
      <header className="bg-zinc-900/50 backdrop-blur-sm border-b border-zinc-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Welcome back, {session?.name.split(' ')[0]}!</h1>
              <p className="text-gray-400 text-sm mt-1">Track your rewards and loyalty progress</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-gray-300 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Your Loyalty Programs</h2>

          {programs.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
              <Award className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">No Programs Yet</h3>
              <p className="text-gray-500">You haven't been enrolled in any loyalty programs yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {programs.map((progress) => {
                const Icon = programTypeIcons[progress.program.type as keyof typeof programTypeIcons] || Award;
                const colorClass = programTypeColors[progress.program.type as keyof typeof programTypeColors];
                const percentage = getProgressPercentage(progress);

                return (
                  <div
                    key={progress.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition"
                  >
                    <div className={`h-2 bg-gradient-to-r ${colorClass}`} style={{ width: `${percentage}%` }}></div>
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white mb-1">{progress.program.name}</h3>
                          {progress.program.status === 'active' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-400">
                              <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                              <span className="w-1.5 h-1.5 bg-gray-500 rounded-full"></span>
                              Paused
                            </span>
                          )}
                        </div>
                        <div className={`p-3 bg-gradient-to-br ${colorClass} rounded-lg`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                      </div>

                      {progress.program.type === 'points' && (
                        <div className="space-y-2">
                          <div className="flex items-end justify-between">
                            <span className="text-3xl font-bold text-white">{progress.points_balance}</span>
                            <span className="text-sm text-gray-400">points</span>
                          </div>
                          <div className="text-sm text-gray-400">
                            Lifetime earned: {progress.total_earned}
                          </div>
                        </div>
                      )}

                      {progress.program.type === 'stamp_card' && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {Array.from({ length: progress.program.config.stampsRequired || 10 }).map((_, i) => (
                              <div
                                key={i}
                                className={`w-8 h-8 rounded-full border-2 ${
                                  i < progress.stamps_current
                                    ? 'bg-blue-500 border-blue-500'
                                    : 'border-zinc-700'
                                }`}
                              />
                            ))}
                          </div>
                          <div className="text-sm text-gray-400">
                            {progress.stamps_current} of {progress.program.config.stampsRequired} stamps
                          </div>
                        </div>
                      )}

                      <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center gap-2 text-xs text-gray-500">
                        <TrendingUp className="w-3 h-3" />
                        <span>Last activity: {new Date(progress.last_activity_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold text-white mb-4">Your Rewards</h2>

          {rewards.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
              <Gift className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">No Rewards Yet</h3>
              <p className="text-gray-500">Keep earning points to unlock rewards!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rewards.map((reward) => (
                <div
                  key={reward.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Gift className="w-5 h-5 text-orange-400" />
                        <h3 className="text-lg font-bold text-white">{reward.reward?.name || 'Reward'}</h3>
                      </div>
                      {reward.reward?.description && (
                        <p className="text-gray-400 text-sm mb-3">{reward.reward.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Earned: {new Date(reward.earned_at).toLocaleDateString()}
                        </span>
                        {reward.program && (
                          <span>From: {reward.program.name}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {reward.status === 'earned' && (
                        <div>
                          <span className="inline-block px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium rounded-full mb-2">
                            Available
                          </span>
                          <div className="text-xs text-gray-500 font-mono bg-zinc-800 px-3 py-2 rounded-lg">
                            {reward.redemption_code}
                          </div>
                          {reward.expires_at && (
                            <p className="text-xs text-orange-400 mt-2">
                              Expires: {new Date(reward.expires_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )}
                      {reward.status === 'redeemed' && (
                        <span className="inline-block px-3 py-1 bg-zinc-700 text-gray-400 text-sm font-medium rounded-full">
                          Redeemed
                        </span>
                      )}
                      {reward.status === 'expired' && (
                        <span className="inline-block px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium rounded-full">
                          Expired
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
