import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, MessageSquare, CheckCircle, XCircle, Clock, Phone, Calendar } from 'lucide-react';

interface SmsLog {
  id: string;
  customer_id: string | null;
  content: string;
  status: string;
  created_at: string;
  provider: string;
  error_message: string | null;
  metadata: {
    recipient_phone?: string;
  };
  customers?: {
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
  } | null;
}

interface SmsLogsModalProps {
  businessId: string;
  onClose: () => void;
}

export default function SmsLogsModal({ businessId, onClose }: SmsLogsModalProps) {
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'sent' | 'failed'>('all');

  useEffect(() => {
    loadLogs();
  }, [filter]);

  const loadLogs = async () => {
    setLoading(true);

    let query = supabase
      .from('communication_logs')
      .select(`
        id,
        customer_id,
        content,
        status,
        created_at,
        provider,
        error_message,
        metadata,
        customers (
          first_name,
          last_name,
          phone
        )
      `)
      .eq('business_id', businessId)
      .eq('type', 'sms')
      .order('created_at', { ascending: false })
      .limit(100);

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query;

    if (!error && data) {
      setLogs(data as SmsLog[]);
    }

    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-yellow-400';
    }
  };

  const getRecipientDisplay = (log: SmsLog) => {
    if (log.customers) {
      const name = [log.customers.first_name, log.customers.last_name]
        .filter(Boolean)
        .join(' ');
      return name || log.customers.phone || log.metadata?.recipient_phone || 'Unknown';
    }
    return log.metadata?.recipient_phone || 'Unknown';
  };

  const filteredCount = {
    all: logs.length,
    sent: logs.filter(l => l.status === 'sent').length,
    failed: logs.filter(l => l.status === 'failed').length,
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-zinc-800 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">SMS Logs</h2>
              <p className="text-sm text-gray-400">
                Communication history for this month
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

        <div className="p-6 border-b border-zinc-800">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'all'
                  ? 'bg-orange-500 text-white'
                  : 'bg-zinc-800 text-gray-400 hover:bg-zinc-750'
              }`}
            >
              All ({filteredCount.all})
            </button>
            <button
              onClick={() => setFilter('sent')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'sent'
                  ? 'bg-green-500 text-white'
                  : 'bg-zinc-800 text-gray-400 hover:bg-zinc-750'
              }`}
            >
              Sent ({filteredCount.sent})
            </button>
            <button
              onClick={() => setFilter('failed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'failed'
                  ? 'bg-red-500 text-white'
                  : 'bg-zinc-800 text-gray-400 hover:bg-zinc-750'
              }`}
            >
              Failed ({filteredCount.failed})
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-400 mb-2">No SMS logs found</h3>
              <p className="text-gray-500">
                {filter === 'all'
                  ? 'SMS logs will appear here once you start sending messages'
                  : `No ${filter} SMS messages found`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 hover:border-zinc-600 transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getStatusIcon(log.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span className="text-white font-medium truncate">
                              {getRecipientDisplay(log)}
                            </span>
                            <span className={`text-xs font-medium uppercase ${getStatusColor(log.status)}`}>
                              {log.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(log.created_at)}</span>
                            {log.provider && (
                              <>
                                <span>•</span>
                                <span className="capitalize">{log.provider}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-300 line-clamp-2 mb-2">
                        {log.content}
                      </p>
                      {log.error_message && (
                        <div className="mt-2 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                          <p className="text-xs text-red-400">
                            <span className="font-medium">Error:</span> {log.error_message}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
