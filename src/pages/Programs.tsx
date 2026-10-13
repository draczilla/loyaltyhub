import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';
import CreateProgramModal, { ProgramFormData } from '../components/CreateProgramModal';
import { Menu, Plus, Gift, Play, Pause, Archive, AlertCircle, X } from 'lucide-react';

interface LoyaltyProgram {
  id: string;
  name: string;
  type: 'points' | 'stamp_card' | 'rebate_code' | 'discount' | 'free_item';
  status: 'active' | 'paused' | 'archived';
  config: Record<string, unknown>;
  created_at: string;
}

const programTypeLabels = {
  points: 'Points Program',
  stamp_card: 'Stamp Card',
  rebate_code: 'Rebate Code',
  discount: 'Discount',
  free_item: 'Free Item'
};

const programTypeColors = {
  points: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  stamp_card: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  rebate_code: 'bg-green-500/10 text-green-400 border-green-500/20',
  discount: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  free_item: 'bg-pink-500/10 text-pink-400 border-pink-500/20'
};

export default function Programs() {
  const { business } = useAuth();
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (business) {
      loadPrograms();
    } else {
      setLoading(false);
    }
  }, [business]);

  const loadPrograms = async () => {
    if (!business) {
      setLoading(false);
      setError('Business context not available');
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from('loyalty_programs')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false });

    if (queryError) {
      setError(`Failed to load programs: ${queryError.message}`);
      setPrograms([]);
    } else if (data) {
      setPrograms(data);
    }

    setLoading(false);
  };

  const toggleProgramStatus = async (programId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';

    const { error } = await supabase
      .from('loyalty_programs')
      .update({ status: newStatus })
      .eq('id', programId);

    if (error) {
      setError(`Failed to update program: ${error.message}`);
    } else {
      loadPrograms();
    }
  };

  const handleCreateProgram = async (programData: ProgramFormData) => {
    if (!business) return;

    const { error } = await supabase
      .from('loyalty_programs')
      .insert({
        business_id: business.id,
        name: programData.name,
        type: programData.type,
        status: 'active',
        config: programData.config
      });

    if (error) {
      setError(`Failed to create program: ${error.message}`);
      throw error;
    }

    await loadPrograms();
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
                <div>
                  <h1 className="text-2xl font-bold text-white">Loyalty Programs</h1>
                  <p className="text-gray-400 text-sm mt-1">
                    {programs.length} {programs.length === 1 ? 'program' : 'programs'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Create Program</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          {error && !loading && programs.length > 0 && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm flex-1">{error}</p>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-400 mt-4">Loading programs...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 max-w-md mx-auto">
                <h3 className="text-xl font-medium text-red-400 mb-2">Error Loading Programs</h3>
                <p className="text-gray-400 mb-4">{error}</p>
                <button
                  onClick={loadPrograms}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : !business ? (
            <div className="text-center py-12">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6 max-w-md mx-auto">
                <h3 className="text-xl font-medium text-yellow-400 mb-2">Business Not Found</h3>
                <p className="text-gray-400">Unable to load business information. Please try logging out and back in.</p>
              </div>
            </div>
          ) : programs.length === 0 ? (
            <div className="text-center py-12">
              <Gift className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-400 mb-2">No programs yet</h3>
              <p className="text-gray-500 mb-6">
                Create your first loyalty program to start rewarding customers
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition"
              >
                <Plus className="w-5 h-5" />
                Create Program
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {programs.map((program) => (
                <div
                  key={program.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-2">{program.name}</h3>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                            programTypeColors[program.type]
                          }`}
                        >
                          {programTypeLabels[program.type]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {program.status === 'active' ? (
                          <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                        ) : (
                          <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                        )}
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-gray-400">
                        Status:{' '}
                        <span className={program.status === 'active' ? 'text-green-400' : 'text-gray-500'}>
                          {program.status.charAt(0).toUpperCase() + program.status.slice(1)}
                        </span>
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleProgramStatus(program.id, program.status)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition text-sm"
                      >
                        {program.status === 'active' ? (
                          <>
                            <Pause className="w-4 h-4" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            Activate
                          </>
                        )}
                      </button>
                      <button className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-gray-400 rounded-lg transition">
                        <Archive className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <CreateProgramModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateProgram}
      />
    </div>
  );
}
