import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Gift,
  Users,
  QrCode,
  Zap,
  BarChart3,
  Mail,
  MessageSquare,
  Check,
  ArrowRight,
  Star,
  Shield,
  Smartphone,
  Trophy,
  Ticket,
  Tag,
  Percent,
  Award,
  Scan,
  Clock,
  TrendingUp,
  FileText,
  Target,
  Send,
  Repeat,
  Building,
  Settings,
  Globe,
  PieChart,
  Activity,
  DollarSign,
  UserPlus,
  BarChart2,
  LineChart
} from 'lucide-react';

interface SubscriptionTier {
  id: string;
  name: string;
  max_customers: number;
  max_programs: number;
  max_sms_monthly: number;
  price_monthly: number;
  features: Record<string, boolean>;
}

export default function Landing() {
  const navigate = useNavigate();
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);

  useEffect(() => {
    loadTiers();
  }, []);

  const loadTiers = async () => {
    const { data } = await supabase
      .from('subscription_tiers')
      .select('*')
      .order('price_monthly', { ascending: true });

    if (data) {
      setTiers(data);
    }
  };

  const handleGetStarted = (tierId: string) => {
    navigate('/signup', { state: { selectedTier: tierId } });
  };

  const features = [
    {
      icon: Gift,
      title: 'Multiple Reward Types',
      description: 'Points, stamp cards, rebates, discounts, and free items all in one platform'
    },
    {
      icon: QrCode,
      title: 'QR Code Sign-ups',
      description: 'Customers scan QR codes to join instantly - no app downloads required'
    },
    {
      icon: Users,
      title: 'Customer Management',
      description: 'Track customer activity, preferences, and reward progress in one place'
    },
    {
      icon: MessageSquare,
      title: 'SMS Campaigns',
      description: 'Send targeted promotions and updates directly to your customers'
    },
    {
      icon: Mail,
      title: 'Email Integration',
      description: 'Sync with MailChimp to leverage your existing email marketing'
    },
    {
      icon: BarChart3,
      title: 'Analytics & Reports',
      description: 'Understand customer behavior and measure program performance'
    }
  ];

  const tierDetails = {
    Free: [
      '50 customers maximum',
      '1 active loyalty program',
      '50 SMS messages per month',
      'Basic analytics',
      'QR code generation',
      'Customer management'
    ],
    Pro: [
      '500 customers maximum',
      '3 active loyalty programs',
      '500 SMS messages per month',
      'Advanced analytics',
      'MailChimp integration',
      'Email campaigns',
      'Priority support'
    ],
    Agency: [
      'Unlimited customers',
      'Unlimited loyalty programs',
      '5,000 SMS messages per month',
      'Advanced analytics',
      'White-label options',
      'Custom domain support',
      'MailChimp integration',
      'Priority support'
    ]
  };

  return (
    <div className="min-h-screen bg-black">
      <header className="border-b border-zinc-800 sticky top-0 z-50 bg-black/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <span className="text-white font-bold text-xl">LoyaltyHub</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/customer/login')}
                className="text-gray-400 hover:text-white transition text-sm"
              >
                Customer Portal
              </button>
              <button
                onClick={() => navigate('/login')}
                className="text-gray-400 hover:text-white transition"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full mb-8">
            <Star className="w-4 h-4 text-orange-400" />
            <span className="text-orange-400 text-sm font-medium">Build Customer Loyalty</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6">
            Turn First-Time Visitors
            <br />
            Into <span className="text-orange-400">Loyal Customers</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-12">
            Create powerful loyalty programs with points, rewards, and automated campaigns.
            No app downloads required - customers join with a simple QR code scan.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/signup')}
              className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-lg font-medium rounded-lg transition"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 px-8 py-4 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white text-lg font-medium rounded-lg transition"
            >
              View Demo
            </button>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">Everything You Need</h2>
          <p className="text-xl text-gray-400">
            Powerful features to grow your business and delight your customers
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-orange-500/50 transition"
            >
              <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-b from-zinc-900/50 to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Multiple Reward Program Types</h2>
            <p className="text-xl text-gray-400">
              Create diverse loyalty programs tailored to your business model
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="p-6 bg-black border border-zinc-800 rounded-xl hover:border-orange-500/50 transition group">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Points Programs</h3>
              <p className="text-gray-400 text-sm">Customers earn points per dollar spent and redeem for rewards</p>
            </div>
            <div className="p-6 bg-black border border-zinc-800 rounded-xl hover:border-orange-500/50 transition group">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <Ticket className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Stamp Cards</h3>
              <p className="text-gray-400 text-sm">Digital punch cards for buy-X-get-one-free promotions</p>
            </div>
            <div className="p-6 bg-black border border-zinc-800 rounded-xl hover:border-orange-500/50 transition group">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <Tag className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Rebate Codes</h3>
              <p className="text-gray-400 text-sm">Generate unique discount codes for customer rewards</p>
            </div>
            <div className="p-6 bg-black border border-zinc-800 rounded-xl hover:border-orange-500/50 transition group">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <Percent className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Percentage Discounts</h3>
              <p className="text-gray-400 text-sm">Offer tiered discounts based on customer loyalty</p>
            </div>
            <div className="p-6 bg-black border border-zinc-800 rounded-xl hover:border-orange-500/50 transition group">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <Award className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Free Items</h3>
              <p className="text-gray-400 text-sm">Reward customers with complimentary products or services</p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-orange-600/20 blur-3xl rounded-full"></div>
              <div className="relative bg-zinc-900 border-4 border-orange-500/30 rounded-3xl p-12 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-48 h-48 bg-white rounded-2xl flex items-center justify-center mb-6 mx-auto">
                    <QrCode className="w-32 h-32 text-black" />
                  </div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-full">
                    <Scan className="w-4 h-4 text-orange-400" />
                    <span className="text-orange-400 text-sm font-medium">Scan to Join</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="text-4xl font-bold text-white mb-6">Instant QR Code Enrollment</h2>
            <p className="text-xl text-gray-400 mb-8">
              Customers join instantly by scanning a QR code. No app downloads, no account creation required.
            </p>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-orange-400 font-bold text-lg">1</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Customer Scans QR Code</h3>
                  <p className="text-gray-400">Display your QR code at checkout or on marketing materials</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-orange-400 font-bold text-lg">2</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Enter Phone Number</h3>
                  <p className="text-gray-400">Simple form captures basic contact information</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-orange-400 font-bold text-lg">3</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Start Earning Rewards</h3>
                  <p className="text-gray-400">Instantly enrolled and ready to collect points</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-8 p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-400 mb-1">&lt; 30s</div>
                <div className="text-sm text-gray-400">Signup Time</div>
              </div>
              <div className="text-center border-l border-r border-zinc-800">
                <div className="text-3xl font-bold text-orange-400 mb-1">0</div>
                <div className="text-sm text-gray-400">Apps Needed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-400 mb-1">100%</div>
                <div className="text-sm text-gray-400">Mobile Ready</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-b from-zinc-900/50 to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold text-white mb-6">Powerful Customer Management</h2>
              <p className="text-xl text-gray-400 mb-8">
                Track customer activity, reward progress, and engagement metrics all in one centralized dashboard.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-black border border-zinc-800 rounded-lg">
                  <Activity className="w-6 h-6 text-orange-400 flex-shrink-0" />
                  <div>
                    <div className="text-white font-medium">Real-time Activity Tracking</div>
                    <div className="text-sm text-gray-400">Monitor transactions and reward progress</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-black border border-zinc-800 rounded-lg">
                  <Target className="w-6 h-6 text-orange-400 flex-shrink-0" />
                  <div>
                    <div className="text-white font-medium">Customer Segmentation</div>
                    <div className="text-sm text-gray-400">Group customers by behavior and preferences</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-black border border-zinc-800 rounded-lg">
                  <FileText className="w-6 h-6 text-orange-400 flex-shrink-0" />
                  <div>
                    <div className="text-white font-medium">Export & Analysis</div>
                    <div className="text-sm text-gray-400">Download customer data for external analysis</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-black border border-zinc-800 rounded-lg">
                  <UserPlus className="w-6 h-6 text-orange-400 flex-shrink-0" />
                  <div>
                    <div className="text-white font-medium">Multiple Enrollment Options</div>
                    <div className="text-sm text-gray-400">QR codes, manual entry, or self-registration</div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                  <h3 className="text-lg font-bold text-white">Customer Overview</h3>
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <div className="w-2 h-2 bg-zinc-700 rounded-full"></div>
                    <div className="w-2 h-2 bg-zinc-700 rounded-full"></div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-black rounded-lg border border-zinc-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Total Customers</div>
                        <div className="text-xl font-bold text-white">1,247</div>
                      </div>
                    </div>
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-black rounded-lg border border-zinc-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Active Members</div>
                        <div className="text-xl font-bold text-white">892</div>
                      </div>
                    </div>
                    <div className="text-sm text-orange-400 font-medium">71.5%</div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-black rounded-lg border border-zinc-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                        <Repeat className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Repeat Rate</div>
                        <div className="text-xl font-bold text-white">3.8x</div>
                      </div>
                    </div>
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                </div>
                <div className="pt-4 border-t border-zinc-800">
                  <div className="text-sm text-gray-400 mb-3">Recent Customers</div>
                  <div className="space-y-2">
                    {['Sarah Johnson', 'Mike Chen', 'Emma Davis'].map((name, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-black rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center">
                            <span className="text-orange-400 text-xs font-medium">{name[0]}</span>
                          </div>
                          <span className="text-white text-sm">{name}</span>
                        </div>
                        <span className="text-xs text-gray-400">{150 - i * 20} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1">
            <div className="relative">
              <div className="absolute -top-6 -left-6 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl"></div>
              <div className="relative bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-3xl p-8 shadow-2xl">
                <div className="w-full max-w-sm mx-auto">
                  <div className="bg-zinc-950 border-4 border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-white" />
                        <span className="text-white font-medium text-sm">LoyaltyHub</span>
                      </div>
                      <Clock className="w-4 h-4 text-white/80" />
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl rounded-tl-none p-4">
                        <p className="text-orange-100 text-sm leading-relaxed">
                          Hi Sarah! You've earned 50 bonus points today. You're only 100 points away from a FREE coffee!
                        </p>
                        <div className="mt-2 text-xs text-orange-400">Just now</div>
                      </div>
                      <div className="flex justify-end">
                        <div className="bg-zinc-800 rounded-2xl rounded-tr-none p-4 max-w-[80%]">
                          <p className="text-gray-300 text-sm">Thanks! How do I redeem?</p>
                          <div className="mt-2 text-xs text-gray-500 text-right">2:34 PM</div>
                        </div>
                      </div>
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl rounded-tl-none p-4">
                        <p className="text-orange-100 text-sm leading-relaxed">
                          Simply show this message at checkout! Your reward code: COFFEE247
                        </p>
                        <div className="mt-2 text-xs text-orange-400">Just now</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-400">
                    <Send className="w-4 h-4 text-orange-400" />
                    <span>Delivered via SMS</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="text-4xl font-bold text-white mb-6">Powerful SMS Campaigns</h2>
            <p className="text-xl text-gray-400 mb-8">
              Send targeted promotions and updates directly to customers. Build templates, track performance, and drive engagement.
            </p>
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <div className="text-white font-medium mb-1">Reusable Templates</div>
                  <div className="text-gray-400 text-sm">Create message templates for consistent branding</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Target className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <div className="text-white font-medium mb-1">Targeted Campaigns</div>
                  <div className="text-gray-400 text-sm">Segment customers and send personalized messages</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <div className="text-white font-medium mb-1">Performance Tracking</div>
                  <div className="text-gray-400 text-sm">Monitor delivery rates and engagement metrics</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <div className="text-white font-medium mb-1">Automated Notifications</div>
                  <div className="text-gray-400 text-sm">Send reward notifications automatically</div>
                </div>
              </div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-medium text-gray-400">SMS Allowances by Tier</div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white">Free</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="w-[10%] h-full bg-orange-500"></div>
                    </div>
                    <span className="text-orange-400 font-medium text-sm">50/month</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white">Pro</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="w-[50%] h-full bg-orange-500"></div>
                    </div>
                    <span className="text-orange-400 font-medium text-sm">500/month</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white">Agency</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="w-[100%] h-full bg-orange-500"></div>
                    </div>
                    <span className="text-orange-400 font-medium text-sm">5,000/month</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-b from-zinc-900/50 to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Email Marketing Integration</h2>
            <p className="text-xl text-gray-400">
              Sync customer data with MailChimp for powerful multi-channel engagement
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Customer Sync</h3>
              <p className="text-gray-400">Automatically sync customer data with your MailChimp account</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Email Campaigns</h3>
              <p className="text-gray-400">Leverage existing email workflows alongside SMS campaigns</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Automated Milestones</h3>
              <p className="text-gray-400">Send automated emails for program milestones and achievements</p>
            </div>
          </div>
          <div className="bg-black border border-zinc-800 rounded-2xl p-8">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Gift className="w-10 h-10 text-white" />
                </div>
                <div className="flex items-center gap-4">
                  <ArrowRight className="w-8 h-8 text-orange-400" />
                </div>
                <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-10 h-10 text-white" />
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-2xl text-orange-400 font-bold">+</span>
                </div>
                <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Mail className="w-10 h-10 text-white" />
                </div>
              </div>
              <div className="text-center lg:text-right">
                <div className="text-3xl font-bold text-white mb-2">Multi-Channel Power</div>
                <p className="text-gray-400">Combine SMS and email for maximum reach and engagement</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">Comprehensive Analytics & Reporting</h2>
          <p className="text-xl text-gray-400">
            Real-time insights to measure program performance and customer behavior
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-orange-400" />
              </div>
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <div className="text-4xl font-bold text-white mb-2">12,847</div>
            <div className="text-gray-400 mb-4">Total Customers</div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-green-400 font-medium">+18.2%</span>
              <span className="text-gray-500">vs last month</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Gift className="w-6 h-6 text-orange-400" />
              </div>
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <div className="text-4xl font-bold text-white mb-2">3,456</div>
            <div className="text-gray-400 mb-4">Rewards Redeemed</div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-green-400 font-medium">+24.8%</span>
              <span className="text-gray-500">vs last month</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-orange-400" />
              </div>
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <div className="text-4xl font-bold text-white mb-2">$124.5k</div>
            <div className="text-gray-400 mb-4">Transaction Volume</div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-green-400 font-medium">+31.5%</span>
              <span className="text-gray-500">vs last month</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Customer Growth</h3>
              <LineChart className="w-5 h-5 text-orange-400" />
            </div>
            <div className="h-48 flex items-end justify-between gap-2">
              {[45, 52, 48, 65, 70, 68, 85, 92, 88, 95, 100, 98].map((height, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-gradient-to-t from-orange-500 to-orange-600 rounded-t-lg transition-all hover:from-orange-400 hover:to-orange-500"
                    style={{ height: `${height}%` }}
                  ></div>
                  <div className="text-xs text-gray-500">
                    {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Program Performance</h3>
              <PieChart className="w-5 h-5 text-orange-400" />
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Points Programs</span>
                  <span className="text-white font-medium">42%</span>
                </div>
                <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full" style={{ width: '42%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Stamp Cards</span>
                  <span className="text-white font-medium">28%</span>
                </div>
                <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full" style={{ width: '28%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Discounts</span>
                  <span className="text-white font-medium">18%</span>
                </div>
                <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full" style={{ width: '18%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Free Items</span>
                  <span className="text-white font-medium">12%</span>
                </div>
                <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full" style={{ width: '12%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-black border border-zinc-800 rounded-xl p-6 text-center">
            <BarChart2 className="w-8 h-8 text-orange-400 mx-auto mb-3" />
            <div className="text-2xl font-bold text-white mb-1">98.5%</div>
            <div className="text-sm text-gray-400">Delivery Rate</div>
          </div>
          <div className="bg-black border border-zinc-800 rounded-xl p-6 text-center">
            <Activity className="w-8 h-8 text-orange-400 mx-auto mb-3" />
            <div className="text-2xl font-bold text-white mb-1">3.2x</div>
            <div className="text-sm text-gray-400">Repeat Rate</div>
          </div>
          <div className="bg-black border border-zinc-800 rounded-xl p-6 text-center">
            <Target className="w-8 h-8 text-orange-400 mx-auto mb-3" />
            <div className="text-2xl font-bold text-white mb-1">62%</div>
            <div className="text-sm text-gray-400">Engagement</div>
          </div>
          <div className="bg-black border border-zinc-800 rounded-xl p-6 text-center">
            <TrendingUp className="w-8 h-8 text-orange-400 mx-auto mb-3" />
            <div className="text-2xl font-bold text-white mb-1">$47</div>
            <div className="text-sm text-gray-400">Avg. Lifetime Value</div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-b from-zinc-900/50 to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Built for Agencies & Multi-Business Management</h2>
            <p className="text-xl text-gray-400">
              Manage multiple clients with powerful super admin tools and white-label capabilities
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-12">
            <div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
                  <h3 className="text-xl font-bold text-white">Super Admin Portal</h3>
                  <Settings className="w-6 h-6 text-orange-400" />
                </div>
                <div className="space-y-3">
                  <div className="bg-black border border-zinc-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Building className="w-5 h-5 text-orange-400" />
                        <span className="text-white font-medium">Coffee Shop Co</span>
                      </div>
                      <span className="px-3 py-1 bg-green-500/10 text-green-400 text-xs font-medium rounded-full">Active</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                      <div>
                        <div className="text-gray-500 text-xs">Customers</div>
                        <div className="text-white font-medium">482</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs">Programs</div>
                        <div className="text-white font-medium">3</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs">SMS Left</div>
                        <div className="text-orange-400 font-medium">350</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-black border border-zinc-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Building className="w-5 h-5 text-orange-400" />
                        <span className="text-white font-medium">Retail Plus</span>
                      </div>
                      <span className="px-3 py-1 bg-green-500/10 text-green-400 text-xs font-medium rounded-full">Active</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                      <div>
                        <div className="text-gray-500 text-xs">Customers</div>
                        <div className="text-white font-medium">1,247</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs">Programs</div>
                        <div className="text-white font-medium">2</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs">SMS Left</div>
                        <div className="text-orange-400 font-medium">478</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-black border border-zinc-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Building className="w-5 h-5 text-orange-400" />
                        <span className="text-white font-medium">Fitness Hub</span>
                      </div>
                      <span className="px-3 py-1 bg-orange-500/10 text-orange-400 text-xs font-medium rounded-full">Trial</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                      <div>
                        <div className="text-gray-500 text-xs">Customers</div>
                        <div className="text-white font-medium">89</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs">Programs</div>
                        <div className="text-white font-medium">1</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs">SMS Left</div>
                        <div className="text-orange-400 font-medium">50</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Manage Multiple Clients</h3>
                    <p className="text-gray-400">Single platform to oversee all client loyalty programs with dedicated dashboards</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Settings className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Subscription Management</h3>
                    <p className="text-gray-400">Control tier assignments, usage tracking, and billing for each client</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">SMS Credit Allocation</h3>
                    <p className="text-gray-400">Monitor and allocate SMS credits across all client accounts</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Globe className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">White-Label Options</h3>
                    <p className="text-gray-400">Customize branding for your agency and individual client needs</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-black border border-zinc-800 rounded-xl p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Building className="w-8 h-8 text-white" />
              </div>
              <div className="text-3xl font-bold text-white mb-2">Unlimited</div>
              <div className="text-gray-400">Clients & Programs</div>
            </div>
            <div className="bg-black border border-zinc-800 rounded-xl p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <div className="text-3xl font-bold text-white mb-2">5,000+</div>
              <div className="text-gray-400">SMS Credits Monthly</div>
            </div>
            <div className="bg-black border border-zinc-800 rounded-xl p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div className="text-3xl font-bold text-white mb-2">Priority</div>
              <div className="text-gray-400">Support & Training</div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
          <p className="text-xl text-gray-400">
            Choose the plan that fits your business. Upgrade or downgrade anytime.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {tiers.map((tier) => {
            const isPopular = tier.name === 'Pro';
            const tierFeatures = tierDetails[tier.name as keyof typeof tierDetails] || [];

            return (
              <div
                key={tier.id}
                className={`relative p-8 rounded-2xl border-2 transition ${
                  isPopular
                    ? 'bg-orange-500/5 border-orange-500'
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full">
                    <span className="text-white text-sm font-medium">Most Popular</span>
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold text-white">${tier.price_monthly}</span>
                    <span className="text-gray-400">/month</span>
                  </div>
                </div>
                <ul className="space-y-4 mb-8">
                  {tierFeatures.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-orange-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-orange-400" />
                      </div>
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleGetStarted(tier.id)}
                  className={`w-full py-3 rounded-lg font-medium transition ${
                    isPopular
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                  }`}
                >
                  {tier.price_monthly === 0 ? 'Start Free' : 'Start Trial'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-bold text-white mb-6">
              Why Choose LoyaltyHub?
            </h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Quick Setup</h3>
                  <p className="text-gray-400">
                    Get started in minutes. Create your first loyalty program and start accepting customers today.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">No App Required</h3>
                  <p className="text-gray-400">
                    Customers join by scanning a QR code. No downloads, no friction, just instant access.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Secure & Reliable</h3>
                  <p className="text-gray-400">
                    Enterprise-grade security with automatic backups. Your data is always safe and accessible.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-black rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500/10 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Active Customers</p>
                    <p className="text-sm text-gray-400">Growing daily</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-orange-400">10,000+</p>
              </div>
              <div className="flex items-center justify-between p-4 bg-black rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500/10 rounded-full flex items-center justify-center">
                    <Gift className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Rewards Redeemed</p>
                    <p className="text-sm text-gray-400">This month</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-orange-400">50,000+</p>
              </div>
              <div className="flex items-center justify-between p-4 bg-black rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500/10 rounded-full flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Avg. Repeat Rate</p>
                    <p className="text-sm text-gray-400">Across all businesses</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-orange-400">3.2x</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Build Customer Loyalty?
          </h2>
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
            Join hundreds of businesses using LoyaltyHub to increase repeat customers and grow revenue.
          </p>
          <button
            onClick={() => navigate('/signup')}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-lg font-medium rounded-lg transition"
          >
            Start Your Free Trial
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      <footer className="border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Gift className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-bold">LoyaltyHub</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-gray-400">
              <a href="/terms" className="hover:text-white transition">Terms of Service</a>
              <a href="/privacy" className="hover:text-white transition">Privacy Policy</a>
              <a href="/cookies" className="hover:text-white transition">Cookie Policy</a>
              <a href="mailto:support@loyaltyhub.com" className="hover:text-white transition">Support</a>
            </div>
            <p className="text-gray-500 text-sm">
              © 2026 LoyaltyHub. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
