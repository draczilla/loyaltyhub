import { useState } from 'react';
import { X, Gift, Award, Ticket, Percent, Sparkles } from 'lucide-react';

interface CreateProgramModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (programData: ProgramFormData) => Promise<void>;
}

export interface ProgramFormData {
  name: string;
  type: 'points' | 'stamp_card' | 'rebate_code' | 'discount' | 'free_item';
  config: Record<string, any>;
}

const programTypes = [
  {
    type: 'points' as const,
    label: 'Points Program',
    icon: Award,
    description: 'Customers earn points per dollar spent and redeem for rewards',
    color: 'orange'
  },
  {
    type: 'stamp_card' as const,
    label: 'Stamp Card',
    icon: Ticket,
    description: 'Digital punch cards for buy-X-get-one-free promotions',
    color: 'blue'
  },
  {
    type: 'rebate_code' as const,
    label: 'Rebate Code',
    icon: Sparkles,
    description: 'Generate unique discount codes for customer rewards',
    color: 'green'
  },
  {
    type: 'discount' as const,
    label: 'Percentage Discount',
    icon: Percent,
    description: 'Offer tiered discounts based on customer loyalty',
    color: 'purple'
  },
  {
    type: 'free_item' as const,
    label: 'Free Item',
    icon: Gift,
    description: 'Reward customers with complimentary products or services',
    color: 'pink'
  }
];

const colorClasses: Record<string, string> = {
  orange: 'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20',
  blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20',
  green: 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20',
  purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20',
  pink: 'bg-pink-500/10 border-pink-500/20 text-pink-400 hover:bg-pink-500/20'
};

export default function CreateProgramModal({ open, onClose, onSubmit }: CreateProgramModalProps) {
  const [step, setStep] = useState<'type' | 'config'>('type');
  const [selectedType, setSelectedType] = useState<ProgramFormData['type'] | null>(null);
  const [programName, setProgramName] = useState('');
  const [config, setConfig] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleTypeSelect = (type: ProgramFormData['type']) => {
    setSelectedType(type);
    setStep('config');

    switch (type) {
      case 'points':
        setConfig({
          pointsPerDollar: 1,
          minimumRedemption: 100,
          pointsExpireDays: 365,
          welcomeBonus: 0
        });
        break;
      case 'stamp_card':
        setConfig({
          stampsRequired: 10,
          rewardDescription: '',
          allowMultipleCards: true,
          cardExpireDays: 90
        });
        break;
      case 'rebate_code':
        setConfig({
          codePrefix: 'SAVE',
          discountType: 'percentage',
          discountValue: 10,
          validDays: 30,
          singleUse: true
        });
        break;
      case 'discount':
        setConfig({
          tiers: [
            { visits: 5, discount: 5 },
            { visits: 10, discount: 10 },
            { visits: 20, discount: 15 }
          ]
        });
        break;
      case 'free_item':
        setConfig({
          itemName: '',
          itemDescription: '',
          requiredPurchases: 5,
          recurring: true,
          validDays: 30
        });
        break;
    }
  };

  const handleSubmit = async () => {
    if (!selectedType || !programName.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit({
        name: programName,
        type: selectedType,
        config
      });
      handleClose();
    } catch (error) {
      console.error('Error creating program:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('type');
    setSelectedType(null);
    setProgramName('');
    setConfig({});
    setSubmitting(false);
    onClose();
  };

  const updateConfig = (key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {step === 'type' ? 'Choose Program Type' : 'Configure Program'}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {step === 'type'
                ? 'Select the type of loyalty program you want to create'
                : `Set up your ${programTypes.find(pt => pt.type === selectedType)?.label}`
              }
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'type' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {programTypes.map((program) => {
                const Icon = program.icon;
                return (
                  <button
                    key={program.type}
                    onClick={() => handleTypeSelect(program.type)}
                    className={`p-6 border rounded-xl text-left transition ${colorClasses[program.color]}`}
                  >
                    <Icon className="w-10 h-10 mb-4" />
                    <h3 className="text-lg font-bold mb-2">{program.label}</h3>
                    <p className="text-sm opacity-80">{program.description}</p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Program Name
                </label>
                <input
                  type="text"
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  placeholder="e.g., VIP Rewards Program"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              {selectedType === 'points' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Points Per Dollar
                      </label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={config.pointsPerDollar}
                        onChange={(e) => updateConfig('pointsPerDollar', parseFloat(e.target.value))}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Minimum Redemption Points
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={config.minimumRedemption}
                        onChange={(e) => updateConfig('minimumRedemption', parseInt(e.target.value))}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Points Expire After (Days)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={config.pointsExpireDays}
                        onChange={(e) => updateConfig('pointsExpireDays', parseInt(e.target.value))}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Set to 0 for no expiration</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Welcome Bonus Points
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={config.welcomeBonus}
                        onChange={(e) => updateConfig('welcomeBonus', parseInt(e.target.value))}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {selectedType === 'stamp_card' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Stamps Required
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="20"
                      value={config.stampsRequired}
                      onChange={(e) => updateConfig('stampsRequired', parseInt(e.target.value))}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Reward Description
                    </label>
                    <input
                      type="text"
                      value={config.rewardDescription}
                      onChange={(e) => updateConfig('rewardDescription', e.target.value)}
                      placeholder="e.g., Free coffee, 50% off next purchase"
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Card Expires After (Days)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={config.cardExpireDays}
                        onChange={(e) => updateConfig('cardExpireDays', parseInt(e.target.value))}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div className="flex items-center pt-8">
                      <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.allowMultipleCards}
                          onChange={(e) => updateConfig('allowMultipleCards', e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-orange-500 focus:ring-orange-500"
                        />
                        Allow Multiple Cards
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {selectedType === 'rebate_code' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Code Prefix
                      </label>
                      <input
                        type="text"
                        value={config.codePrefix}
                        onChange={(e) => updateConfig('codePrefix', e.target.value.toUpperCase())}
                        placeholder="SAVE"
                        maxLength={6}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Discount Type
                      </label>
                      <select
                        value={config.discountType}
                        onChange={(e) => updateConfig('discountType', e.target.value)}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                      >
                        <option value="percentage">Percentage</option>
                        <option value="fixed">Fixed Amount</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Discount Value
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={config.discountValue}
                        onChange={(e) => updateConfig('discountValue', parseFloat(e.target.value))}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {config.discountType === 'percentage' ? '% off' : '$ off'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Valid For (Days)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={config.validDays}
                        onChange={(e) => updateConfig('validDays', parseInt(e.target.value))}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.singleUse}
                        onChange={(e) => updateConfig('singleUse', e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-orange-500 focus:ring-orange-500"
                      />
                      Single Use Per Customer
                    </label>
                  </div>
                </div>
              )}

              {selectedType === 'discount' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-400">
                    Set discount tiers based on number of visits. Customers automatically qualify as they reach each tier.
                  </p>
                  {config.tiers?.map((tier: any, index: number) => (
                    <div key={index} className="grid grid-cols-2 gap-4 p-4 bg-zinc-800 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          After {index === 0 ? 'First' : ''} Visits
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={tier.visits}
                          onChange={(e) => {
                            const newTiers = [...config.tiers];
                            newTiers[index].visits = parseInt(e.target.value);
                            updateConfig('tiers', newTiers);
                          }}
                          className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Discount %
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={tier.discount}
                          onChange={(e) => {
                            const newTiers = [...config.tiers];
                            newTiers[index].discount = parseInt(e.target.value);
                            updateConfig('tiers', newTiers);
                          }}
                          className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedType === 'free_item' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Item Name
                    </label>
                    <input
                      type="text"
                      value={config.itemName}
                      onChange={(e) => updateConfig('itemName', e.target.value)}
                      placeholder="e.g., Free Dessert, Free Service"
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Item Description
                    </label>
                    <textarea
                      value={config.itemDescription}
                      onChange={(e) => updateConfig('itemDescription', e.target.value)}
                      placeholder="Describe what the customer receives..."
                      rows={3}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Required Purchases
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={config.requiredPurchases}
                        onChange={(e) => updateConfig('requiredPurchases', parseInt(e.target.value))}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Valid For (Days)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={config.validDays}
                        onChange={(e) => updateConfig('validDays', parseInt(e.target.value))}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.recurring}
                        onChange={(e) => updateConfig('recurring', e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-orange-500 focus:ring-orange-500"
                      />
                      Recurring Reward (resets after claimed)
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {step === 'config' && (
          <div className="p-6 border-t border-zinc-800 flex items-center justify-between">
            <button
              onClick={() => setStep('type')}
              className="px-4 py-2 text-gray-400 hover:text-white transition"
            >
              Back
            </button>
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!programName.trim() || submitting}
                className="px-6 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating...' : 'Create Program'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
