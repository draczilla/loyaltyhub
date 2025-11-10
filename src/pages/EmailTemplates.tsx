import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';
import VerificationGuard from '../components/VerificationGuard';
import { Menu, Mail, Plus, Edit2, Save, X, AlertCircle, Check } from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  trigger_type: 'welcome' | 'promotional' | 'reward' | 'birthday' | 'custom';
  active: boolean;
  config: Record<string, any>;
}

export default function EmailTemplates() {
  const { business } = useAuth();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
    trigger_type: 'custom' as EmailTemplate['trigger_type'],
    active: true,
  });

  useEffect(() => {
    if (business) {
      loadTemplates();
    }
  }, [business]);

  const loadTemplates = async () => {
    if (!business) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTemplates(data);
    }
    setLoading(false);
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingId(template.id);
    setFormData({
      name: template.name,
      subject: template.subject,
      body: template.body,
      trigger_type: template.trigger_type,
      active: template.active,
    });
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      name: '',
      subject: '',
      body: '',
      trigger_type: 'custom',
      active: true,
    });
    setError('');
    setSuccess('');
  };

  const handleSave = async (templateId?: string) => {
    if (!business) return;

    setError('');
    setSuccess('');

    if (!formData.name || !formData.subject || !formData.body) {
      setError('Name, subject, and body are required');
      return;
    }

    try {
      if (templateId) {
        const { error: updateError } = await supabase
          .from('email_templates')
          .update({
            name: formData.name,
            subject: formData.subject,
            body: formData.body,
            active: formData.active,
          })
          .eq('id', templateId);

        if (updateError) throw updateError;
        setSuccess('Template updated successfully');
      } else {
        const { error: insertError } = await supabase
          .from('email_templates')
          .insert({
            business_id: business.id,
            name: formData.name,
            subject: formData.subject,
            body: formData.body,
            trigger_type: formData.trigger_type,
            active: formData.active,
            config: {},
          });

        if (insertError) throw insertError;
        setSuccess('Template created successfully');
      }

      handleCancel();
      await loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    }
  };

  const toggleActive = async (templateId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({ active: !currentActive })
        .eq('id', templateId);

      if (error) throw error;
      await loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle template');
    }
  };

  const getTriggerLabel = (triggerType: string) => {
    const labels: Record<string, string> = {
      welcome: 'Welcome Email',
      promotional: 'Promotional',
      reward: 'Reward',
      birthday: 'Birthday',
      custom: 'Custom',
    };
    return labels[triggerType] || triggerType;
  };

  return (
    <VerificationGuard featureName="Email Templates">
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
                  <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">Email Templates</h1>
                    <p className="text-gray-400 text-sm mt-1">Manage email message templates</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setEditingId('new')}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">New Template</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-start gap-3">
              <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-green-400 text-sm">{success}</p>
            </div>
          )}

          {editingId === 'new' && (
            <div className="mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Create New Template</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                    placeholder="Welcome Email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                    placeholder="Welcome to {business_name}!"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Body
                  </label>
                  <textarea
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    rows={8}
                    className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition resize-none"
                    placeholder="Hi {firstName}!&#10;&#10;Welcome to {business_name}. We're excited to have you as part of our loyalty program!&#10;&#10;You currently have {points} points..."
                  />
                  <p className="text-xs text-gray-500 mt-1.5">
                    Available variables: {'{business_name}'}, {'{name}'}, {'{firstName}'}, {'{lastName}'}, {'{email}'}, {'{points}'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Trigger Type
                  </label>
                  <select
                    value={formData.trigger_type}
                    onChange={(e) => setFormData({ ...formData, trigger_type: e.target.value as any })}
                    className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                  >
                    <option value="welcome">Welcome Email</option>
                    <option value="promotional">Promotional</option>
                    <option value="reward">Reward</option>
                    <option value="birthday">Birthday</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4 rounded border-zinc-700 text-orange-500 focus:ring-orange-500 focus:ring-offset-0 bg-black"
                  />
                  <label className="text-sm text-gray-300">Active</label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleCancel}
                    className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSave()}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition"
                  >
                    Create Template
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-400 mb-2">No templates yet</h3>
              <p className="text-gray-500 mb-6">
                Create your first email template to streamline customer communication
              </p>
              <button
                onClick={() => setEditingId('new')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition"
              >
                <Plus className="w-5 h-5" />
                Create Template
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
                >
                  {editingId === template.id ? (
                    <div className="p-6 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Template Name
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Email Subject
                        </label>
                        <input
                          type="text"
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Email Body
                        </label>
                        <textarea
                          value={formData.body}
                          onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                          rows={8}
                          className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Trigger Type
                        </label>
                        <select
                          value={formData.trigger_type}
                          onChange={(e) => setFormData({ ...formData, trigger_type: e.target.value as any })}
                          className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                        >
                          <option value="welcome">Welcome Email</option>
                          <option value="promotional">Promotional</option>
                          <option value="reward">Reward</option>
                          <option value="birthday">Birthday</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={formData.active}
                          onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                          className="w-4 h-4 rounded border-zinc-700 text-orange-500 focus:ring-orange-500 focus:ring-offset-0 bg-black"
                        />
                        <label className="text-sm text-gray-300">Active</label>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={handleCancel}
                          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSave(template.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition"
                        >
                          <Save className="w-4 h-4" />
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-white">{template.name}</h3>
                            <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              {getTriggerLabel(template.trigger_type)}
                            </span>
                            {template.active ? (
                              <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                                Active
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">
                                Inactive
                              </span>
                            )}
                          </div>
                          <p className="text-gray-400 text-sm font-medium mb-1">Subject: {template.subject}</p>
                          <p className="text-gray-400 text-sm line-clamp-2">{template.body}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleActive(template.id, template.active)}
                            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition text-sm"
                          >
                            {template.active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleEdit(template)}
                            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
    </VerificationGuard>
  );
}
