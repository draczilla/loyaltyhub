import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { sendTransactionalSms } from '../lib/transactionalSms';
import { X, MessageSquare, Send, AlertCircle, Check } from 'lucide-react';

interface SmsTemplate {
  id: string;
  name: string;
  message_template: string;
  trigger_type: string;
}

interface Customer {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  total_points: number;
  opted_in_sms: boolean;
}

interface QuickSmsModalProps {
  customer: Customer;
  businessId: string;
  businessName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function QuickSmsModal({
  customer,
  businessId,
  businessName,
  onClose,
  onSuccess,
}: QuickSmsModalProps) {
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<SmsTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sms_templates')
      .select('*')
      .eq('business_id', businessId)
      .eq('active', true)
      .order('name');

    if (!error && data) {
      setTemplates(data);
    }
    setLoading(false);
  };

  const replaceVariables = (text: string): string => {
    const name = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'Customer';
    return text
      .replace(/\{business_name\}/g, businessName)
      .replace(/\{name\}/g, name)
      .replace(/\{firstName\}/g, customer.first_name || 'Customer')
      .replace(/\{lastName\}/g, customer.last_name || '')
      .replace(/\{points\}/g, customer.total_points.toString());
  };

  const handleSend = async () => {
    if (!selectedTemplate || !customer.phone) return;

    if (!customer.opted_in_sms) {
      setError('Customer has not opted in to receive SMS messages');
      return;
    }

    setSending(true);
    setError('');

    try {
      const message = replaceVariables(selectedTemplate.message_template);

      const smsResult = await sendTransactionalSms(customer.phone, message);

      if (!smsResult.success) {
        throw new Error(smsResult.error || 'Failed to send SMS');
      }

      const { error: logError } = await supabase.from('communication_logs').insert({
        business_id: businessId,
        customer_id: customer.id,
        type: 'sms',
        template_id: selectedTemplate.id,
        template_name: selectedTemplate.name,
        subject: null,
        content: message,
        status: 'sent',
        metadata: {},
      });

      if (logError) throw logError;

      const { error: usageError } = await supabase.rpc('increment_business_usage', {
        p_business_id: businessId,
        p_column_name: 'usage_sms_monthly',
      });

      if (usageError) {
        console.error('Failed to increment SMS usage:', usageError);
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send SMS');
      setSending(false);
    }
  };

  const getCharacterCount = (text: string): number => {
    return replaceVariables(text).length;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-zinc-800">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Quick SMS</h2>
              <p className="text-sm text-gray-400">
                Send to: {customer.first_name || customer.last_name ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : customer.phone}
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
              <p className="text-green-400 text-sm">SMS sent successfully!</p>
            </div>
          )}

          {!customer.opted_in_sms && (
            <div className="mb-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-yellow-400 text-sm">
                This customer has not opted in to receive SMS messages.
              </p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-400 mb-2">No SMS templates</h3>
              <p className="text-gray-500">
                Create SMS templates first to use quick SMS feature
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
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="text-white font-medium">{template.name}</h4>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {getCharacterCount(template.message_template)} chars
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-2">
                    {replaceVariables(template.message_template)}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="text-sm text-orange-400 hover:text-orange-300 transition"
              >
                ← Change template
              </button>

              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-300">Preview:</h3>
                  <span className="text-xs text-gray-500">
                    {getCharacterCount(selectedTemplate.message_template)} characters
                  </span>
                </div>
                <p className="text-gray-300 whitespace-pre-wrap">
                  {replaceVariables(selectedTemplate.message_template)}
                </p>
              </div>

              {getCharacterCount(selectedTemplate.message_template) > 160 && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                  <p className="text-yellow-400 text-xs">
                    Message is longer than 160 characters and will be sent as multiple SMS segments.
                  </p>
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
            disabled={!selectedTemplate || sending || success || !customer.opted_in_sms}
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
                Send SMS
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
