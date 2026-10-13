import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Mail, Send, AlertCircle, Check, Edit2 } from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  trigger_type: string;
}

interface Customer {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  total_points: number;
}

interface FastEmailModalProps {
  customer: Customer;
  businessId: string;
  businessName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function FastEmailModal({
  customer,
  businessId,
  businessName,
  onClose,
  onSuccess,
}: FastEmailModalProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('business_id', businessId)
      .eq('active', true)
      .order('name');

    if (!error && data) {
      setTemplates(data);
    }
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const replaceVariables = (text: string): string => {
    const name = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'Customer';
    return text
      .replace(/\{business_name\}/g, businessName)
      .replace(/\{name\}/g, name)
      .replace(/\{firstName\}/g, customer.first_name || 'Customer')
      .replace(/\{lastName\}/g, customer.last_name || '')
      .replace(/\{email\}/g, customer.email || '')
      .replace(/\{points\}/g, customer.total_points.toString());
  };

  const handleEditClick = () => {
    if (selectedTemplate) {
      setEditedSubject(replaceVariables(selectedTemplate.subject));
      setEditedBody(replaceVariables(selectedTemplate.body));
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedSubject('');
    setEditedBody('');
  };

  const handleSend = async () => {
    if (!selectedTemplate || !customer.email) {
      setError('Customer email address is required');
      return;
    }

    setSending(true);
    setError('');

    try {
      const subject = isEditing ? editedSubject : replaceVariables(selectedTemplate.subject);
      const body = isEditing ? editedBody : replaceVariables(selectedTemplate.body);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data: { user } } = await supabase.auth.getUser();
      console.log('Fast Email - Current user:', user?.id);
      console.log('Fast Email - Business ID being sent:', businessId);
      console.log('Fast Email - Customer:', { id: customer.id, email: customer.email });

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-transactional-email`;

      const payload = {
        businessId,
        customerId: customer.id,
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        subject,
        body,
        recipientEmail: customer.email,
        recipientName: [customer.first_name, customer.last_name].filter(Boolean).join(' ') || undefined,
        isTestEmail: false,
      };

      console.log('Fast Email - Sending payload:', payload);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      console.log('Fast Email - Response:', { status: response.status, result });

      if (!response.ok || !result.success) {
        const errorMsg = result.details
          ? `${result.error}: ${result.details}`
          : result.error || 'Failed to send email';
        throw new Error(errorMsg);
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Fast Email - Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send email';
      setError(errorMessage);
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-zinc-800">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Fast Email</h2>
              <p className="text-sm text-gray-400">
                Send to: {customer.first_name || customer.last_name ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : customer.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-start gap-3">
              <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-green-400 text-sm">Email sent successfully!</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-400 mb-2">No email templates</h3>
              <p className="text-gray-500">
                Create email templates first to use fast email feature
              </p>
            </div>
          ) : !selectedTemplate ? (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Select a template:</h3>
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className="w-full text-left p-4 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 hover:border-orange-500 rounded-lg transition"
                >
                  <h4 className="text-white font-medium mb-1">{template.name}</h4>
                  <p className="text-sm text-gray-400 mb-2">
                    Subject: {replaceVariables(template.subject)}
                  </p>
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {replaceVariables(template.body)}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setSelectedTemplate(null);
                    setIsEditing(false);
                    setEditedSubject('');
                    setEditedBody('');
                  }}
                  className="text-sm text-orange-400 hover:text-orange-300 transition"
                >
                  ← Change template
                </button>
                {!isEditing && (
                  <button
                    onClick={handleEditClick}
                    className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition"
                  >
                    <Edit2 className="w-4 h-4" />
                    Quick Edit
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                    <p className="text-yellow-400 text-xs">
                      Quick edit mode - changes will only apply to this message and won't be saved to the template.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Subject:
                    </label>
                    <input
                      type="text"
                      value={editedSubject}
                      onChange={(e) => setEditedSubject(e.target.value)}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                      placeholder="Email subject"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Message:
                    </label>
                    <textarea
                      value={editedBody}
                      onChange={(e) => setEditedBody(e.target.value)}
                      rows={8}
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 resize-none"
                      placeholder="Email message"
                    />
                  </div>

                  <button
                    onClick={handleCancelEdit}
                    className="text-sm text-gray-400 hover:text-white transition"
                  >
                    Cancel editing
                  </button>
                </div>
              ) : (
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-300 mb-3">Preview:</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Subject:</p>
                      <p className="text-white font-medium">{replaceVariables(selectedTemplate.subject)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Message:</p>
                      <p className="text-gray-300 whitespace-pre-wrap">
                        {replaceVariables(selectedTemplate.body)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t border-zinc-800">
          <button
            onClick={onClose}
            disabled={sending}
            className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!selectedTemplate || sending || success}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition"
          >
            {sending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Email
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
