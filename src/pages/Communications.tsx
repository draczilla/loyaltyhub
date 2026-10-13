import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { one } from '../lib/relations';
import Sidebar from '../components/Sidebar';
import { Menu, Mail, MessageSquare, Search, CheckCircle, XCircle, Clock, Eye, User, Beaker } from 'lucide-react';

interface CommunicationLog {
  id: string;
  customer_id: string;
  type: 'email' | 'sms';
  template_name: string | null;
  subject: string | null;
  content: string;
  status: 'sent' | 'failed' | 'pending';
  opened_at: string | null;
  open_count: number;
  provider: string | null;
  provider_message_id: string | null;
  created_at: string;
  is_test_email: boolean;
  metadata?: {
    recipient_email?: string;
    recipient_name?: string;
  };
  customer: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  };
}

export default function Communications() {
  const { business } = useAuth();
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<CommunicationLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'email' | 'sms'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'sent' | 'failed' | 'opened'>('all');
  const [showTestEmails, setShowTestEmails] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<CommunicationLog | null>(null);


  useEffect(() => {
    let filtered = logs;

    if (!showTestEmails) {
      filtered = filtered.filter(log => !log.is_test_email);
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(log => log.type === filterType);
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'opened') {
        filtered = filtered.filter(log => log.opened_at !== null);
      } else {
        filtered = filtered.filter(log => log.status === filterStatus);
      }
    }

    if (searchQuery) {
      filtered = filtered.filter(log => {
        const customerName = [log.customer?.first_name, log.customer?.last_name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        const recipientEmail = log.metadata?.recipient_email || log.customer?.email || '';
        const searchLower = searchQuery.toLowerCase();

        return (
          customerName.includes(searchLower) ||
          recipientEmail.toLowerCase().includes(searchLower) ||
          log.customer?.phone?.includes(searchQuery) ||
          log.subject?.toLowerCase().includes(searchLower) ||
          log.template_name?.toLowerCase().includes(searchLower)
        );
      });
    }

    filtered.sort((a, b) => {
      if (a.is_test_email && !b.is_test_email) return 1;
      if (!a.is_test_email && b.is_test_email) return -1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setFilteredLogs(filtered);
  }, [searchQuery, filterType, filterStatus, showTestEmails, logs]);

  const loadCommunicationLogs = useCallback(async () => {
    if (!business) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('communication_logs')
      .select(`
        *,
        customer:customers(first_name, last_name, email, phone)
      `)
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Error loading communication logs:', error);
    }

    if (data) {
      const mapped = data.map((row) => ({
        ...row,
        customer: one(row.customer) ?? {
          first_name: null,
          last_name: null,
          email: null,
          phone: null,
        },
      }));
      setLogs(mapped);
      setFilteredLogs(mapped);
    } else {
      setLogs([]);
      setFilteredLogs([]);
    }

    setLoading(false);
  }, [business]);

  useEffect(() => {
    if (business) {
      loadCommunicationLogs();
    }
  }, [business, loadCommunicationLogs]);

  const getStatusIcon = (status: string, openedAt: string | null) => {
    if (openedAt) {
      return <Eye className="w-4 h-4 text-blue-400" />;
    }
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (log: CommunicationLog) => {
    if (log.opened_at) {
      return `Opened ${log.open_count} time${log.open_count !== 1 ? 's' : ''}`;
    }
    return log.status.charAt(0).toUpperCase() + log.status.slice(1);
  };

  const getStatusColor = (status: string, openedAt: string | null) => {
    if (openedAt) {
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
    switch (status) {
      case 'sent':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'failed':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
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
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">Communication History</h1>
                    <p className="text-gray-400 text-sm mt-1">View all sent emails and SMS messages</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by customer, subject, or template..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-black border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={filterType}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'all' || value === 'email' || value === 'sms') setFilterType(value);
                  }}
                  className="px-4 py-2 bg-black border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                >
                  <option value="all">All Types</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'all' || value === 'sent' || value === 'failed' || value === 'opened') {
                      setFilterStatus(value);
                    }
                  }}
                  className="px-4 py-2 bg-black border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                >
                  <option value="all">All Status</option>
                  <option value="sent">Sent</option>
                  <option value="opened">Opened</option>
                  <option value="failed">Failed</option>
                </select>

                <button
                  onClick={() => setShowTestEmails(!showTestEmails)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                    showTestEmails
                      ? 'bg-orange-500 text-white'
                      : 'bg-black border border-zinc-700 text-gray-400 hover:border-orange-500'
                  }`}
                >
                  <Beaker className="w-4 h-4" />
                  {showTestEmails ? 'Hide Tests' : 'Show Tests'}
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-400 mb-2">No communication logs</h3>
              <p className="text-gray-500">
                {logs.length === 0
                  ? 'Send your first email or SMS to see communication history'
                  : 'No logs match your current filters'}
              </p>
              {logs.length === 0 && (
                <div className="mt-6 p-4 bg-zinc-900 border border-zinc-800 rounded-lg max-w-md mx-auto text-left">
                  <p className="text-xs text-gray-400 mb-2">Debug Info:</p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li>Business ID: {business?.id}</li>
                    <li>Check browser console for detailed logs</li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`border rounded-xl p-4 hover:border-zinc-700 transition cursor-pointer ${
                    log.is_test_email
                      ? 'bg-blue-500/5 border-blue-500/20'
                      : 'bg-zinc-900 border-zinc-800'
                  }`}
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {log.is_test_email && (
                        <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Beaker className="w-5 h-5 text-blue-400" />
                        </div>
                      )}
                      {!log.is_test_email && (
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          log.type === 'email' ? 'bg-blue-500/10' : 'bg-green-500/10'
                        }`}>
                          {log.type === 'email' ? (
                            <Mail className={`w-5 h-5 ${log.type === 'email' ? 'text-blue-400' : 'text-green-400'}`} />
                          ) : (
                            <MessageSquare className="w-5 h-5 text-green-400" />
                          )}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-white font-medium truncate">
                            {log.template_name || (log.type === 'email' ? 'Email Message' : 'SMS Message')}
                          </h3>
                          {log.is_test_email && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              Test
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(log.status, log.opened_at)}`}>
                            {getStatusLabel(log)}
                          </span>
                        </div>

                        {log.subject && (
                          <p className="text-sm text-gray-400 mb-1 truncate">{log.subject}</p>
                        )}

                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {log.is_test_email
                              ? (log.metadata?.recipient_email || 'Test Recipient')
                              : (log.customer
                                ? ([log.customer?.first_name, log.customer?.last_name].filter(Boolean).join(' ') ||
                                   log.customer?.email ||
                                   log.customer?.phone ||
                                   'Unknown')
                                : (log.metadata?.recipient_email || log.metadata?.recipient_name || 'Direct Email'))}
                          </span>
                          <span>{formatDate(log.created_at)}</span>
                          {log.provider && (
                            <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded">
                              {log.provider}
                            </span>
                          )}
                          {log.opened_at && log.type === 'email' && (
                            <span className="text-xs text-blue-400 flex items-center gap-1" title={`First opened: ${formatDate(log.opened_at)}`}>
                              <Eye className="w-3 h-3" />
                              {log.open_count}x
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusIcon(log.status, log.opened_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedLog(null)}>
          <div className="bg-zinc-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-zinc-800" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">
                  {selectedLog.type === 'email' ? 'Email' : 'SMS'} Details
                </h2>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-white transition"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-400">{selectedLog.customer ? 'Customer' : 'Recipient'}:</span>
                  <span className="text-white ml-2">
                    {selectedLog.customer
                      ? ([selectedLog.customer.first_name, selectedLog.customer.last_name].filter(Boolean).join(' ') ||
                         selectedLog.customer.email ||
                         selectedLog.customer.phone)
                      : (selectedLog.metadata?.recipient_email || selectedLog.metadata?.recipient_name || 'Unknown')}
                  </span>
                </div>

                {selectedLog.template_name && (
                  <div>
                    <span className="text-gray-400">Template:</span>
                    <span className="text-white ml-2">{selectedLog.template_name}</span>
                  </div>
                )}

                {selectedLog.subject && (
                  <div>
                    <span className="text-gray-400">Subject:</span>
                    <span className="text-white ml-2">{selectedLog.subject}</span>
                  </div>
                )}

                <div>
                  <span className="text-gray-400">Status:</span>
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(selectedLog.status, selectedLog.opened_at)}`}>
                    {getStatusLabel(selectedLog)}
                  </span>
                </div>

                {selectedLog.opened_at && (
                  <div>
                    <span className="text-gray-400">First Opened:</span>
                    <span className="text-white ml-2">{formatDate(selectedLog.opened_at)}</span>
                  </div>
                )}

                {selectedLog.opened_at && selectedLog.open_count > 0 && (
                  <div>
                    <span className="text-gray-400">Total Opens:</span>
                    <span className="text-white ml-2">{selectedLog.open_count}</span>
                  </div>
                )}

                {!selectedLog.opened_at && selectedLog.type === 'email' && selectedLog.status === 'sent' && (
                  <div>
                    <span className="text-gray-400">Open Status:</span>
                    <span className="text-yellow-400 ml-2">Not opened yet</span>
                  </div>
                )}

                <div>
                  <span className="text-gray-400">Sent:</span>
                  <span className="text-white ml-2">{formatDate(selectedLog.created_at)}</span>
                </div>

                {selectedLog.provider_message_id && (
                  <div>
                    <span className="text-gray-400">Message ID:</span>
                    <span className="text-white ml-2 text-xs font-mono">{selectedLog.provider_message_id}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-96">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Message Content:</h3>
              <div className="bg-black border border-zinc-700 rounded-lg p-4">
                <p className="text-white whitespace-pre-wrap">{selectedLog.content}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
