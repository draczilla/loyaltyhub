import { useState, useEffect } from 'react';
import { Menu, Search, Filter, Download, Mail, MessageSquare, Check, X, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import SuperAdminSidebar from '../components/SuperAdminSidebar';
import { supabase } from '../lib/supabase';

interface CommunicationLog {
  id: string;
  business_id: string;
  customer_id: string | null;
  type: 'email' | 'sms';
  template_id: string | null;
  template_name: string | null;
  subject: string | null;
  content: string;
  status: 'sent' | 'failed' | 'pending';
  error_message: string | null;
  provider: string | null;
  provider_message_id: string | null;
  failure_attempt_count: number;
  metadata: any;
  created_at: string;
  business_name?: string;
  customer_name?: string;
}

interface Business {
  id: string;
  company_name: string;
}

export default function SuperAdminCommunicationLogs() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'email' | 'sms'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'sent' | 'failed' | 'pending'>('all');
  const [filterBusiness, setFilterBusiness] = useState<string>('all');
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadBusinesses();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [page, filterType, filterStatus, filterBusiness, filterProvider, dateFrom, dateTo, searchTerm]);

  const loadBusinesses = async () => {
    const { data } = await supabase
      .from('businesses')
      .select('id, company_name')
      .order('company_name');

    if (data) {
      setBusinesses(data);
    }
  };

  const loadLogs = async () => {
    setLoading(true);

    let query = supabase
      .from('communication_logs')
      .select(`
        *,
        businesses!inner(company_name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (filterType !== 'all') {
      query = query.eq('type', filterType);
    }

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    if (filterBusiness !== 'all') {
      query = query.eq('business_id', filterBusiness);
    }

    if (filterProvider !== 'all') {
      query = query.eq('provider', filterProvider);
    }

    if (dateFrom) {
      query = query.gte('created_at', new Date(dateFrom).toISOString());
    }

    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      query = query.lte('created_at', endDate.toISOString());
    }

    if (searchTerm) {
      query = query.or(`subject.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%,metadata->>recipient_email.ilike.%${searchTerm}%,metadata->>recipient_phone.ilike.%${searchTerm}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error loading logs:', error);
    } else if (data) {
      const formattedLogs = data.map((log: any) => ({
        ...log,
        business_name: log.businesses?.company_name,
      }));
      setLogs(formattedLogs);
      setTotalCount(count || 0);
    }

    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Check className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <X className="w-4 h-4 text-red-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'failed':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'pending':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getProviderBadge = (provider: string | null, type: string) => {
    if (!provider) return null;

    const colors: Record<string, string> = {
      brevo: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      twilio: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      sendgrid: 'bg-green-500/10 text-green-400 border-green-500/20',
    };

    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${colors[provider] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
        {provider.toUpperCase()}
      </span>
    );
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Business', 'Type', 'Status', 'Provider', 'Recipient', 'Subject/Preview', 'Error'];
    const rows = logs.map(log => [
      new Date(log.created_at).toLocaleString(),
      log.business_name || '',
      log.type,
      log.status,
      log.provider || '',
      log.type === 'email' ? (log.metadata?.recipient_email || '') : (log.metadata?.recipient_phone || ''),
      log.subject || log.content.substring(0, 50),
      log.error_message || '',
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `communication-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const getStats = () => {
    return {
      total: totalCount,
      sent: logs.filter(l => l.status === 'sent').length,
      failed: logs.filter(l => l.status === 'failed').length,
      email: logs.filter(l => l.type === 'email').length,
      sms: logs.filter(l => l.type === 'sms').length,
    };
  };

  const stats = getStats();

  return (
    <div className="min-h-screen bg-black flex">
      <SuperAdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-h-screen lg:ml-64">
        <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-400 hover:text-white transition"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white">Communication Logs</h1>
                <p className="text-gray-400 text-sm mt-1">All emails and SMS messages sent across all tenants</p>
              </div>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-lg transition"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="text-sm text-gray-400">Total Logs</div>
              <div className="text-2xl font-bold text-white mt-1">{totalCount.toLocaleString()}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="text-sm text-gray-400">Sent</div>
              <div className="text-2xl font-bold text-green-400 mt-1">{stats.sent}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="text-sm text-gray-400">Failed</div>
              <div className="text-2xl font-bold text-red-400 mt-1">{stats.failed}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="text-sm text-gray-400">Emails</div>
              <div className="text-2xl font-bold text-blue-400 mt-1">{stats.email}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="text-sm text-gray-400">SMS</div>
              <div className="text-2xl font-bold text-orange-400 mt-1">{stats.sms}</div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search by recipient email, phone, subject, or content..."
                    className="w-full pl-10 pr-4 py-2 bg-black border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                    showFilters ? 'bg-orange-500 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-gray-300'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Filters
                </button>
              </div>

              {showFilters && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4 bg-black rounded-lg border border-zinc-800">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                    <select
                      value={filterType}
                      onChange={(e) => {
                        setFilterType(e.target.value as any);
                        setPage(1);
                      }}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                    >
                      <option value="all">All Types</option>
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => {
                        setFilterStatus(e.target.value as any);
                        setPage(1);
                      }}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                    >
                      <option value="all">All Status</option>
                      <option value="sent">Sent</option>
                      <option value="failed">Failed</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Business</label>
                    <select
                      value={filterBusiness}
                      onChange={(e) => {
                        setFilterBusiness(e.target.value);
                        setPage(1);
                      }}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                    >
                      <option value="all">All Businesses</option>
                      {businesses.map((business) => (
                        <option key={business.id} value={business.id}>
                          {business.company_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Provider</label>
                    <select
                      value={filterProvider}
                      onChange={(e) => {
                        setFilterProvider(e.target.value);
                        setPage(1);
                      }}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                    >
                      <option value="all">All Providers</option>
                      <option value="brevo">Brevo</option>
                      <option value="twilio">Twilio</option>
                      <option value="sendgrid">SendGrid</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Date From</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => {
                        setDateFrom(e.target.value);
                        setPage(1);
                      }}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Date To</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => {
                        setDateTo(e.target.value);
                        setPage(1);
                      }}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                    />
                  </div>
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p>No communication logs found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-black/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Date/Time
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Business
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Recipient
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Subject/Preview
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Provider
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-zinc-800/50 transition">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-white">
                              {new Date(log.created_at).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(log.created_at).toLocaleTimeString()}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-white">{log.business_name}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {log.type === 'email' ? (
                                <Mail className="w-4 h-4 text-blue-400" />
                              ) : (
                                <MessageSquare className="w-4 h-4 text-orange-400" />
                              )}
                              <span className="text-sm text-gray-300 capitalize">{log.type}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-white max-w-xs truncate">
                              {log.type === 'email'
                                ? log.metadata?.recipient_email || 'N/A'
                                : log.metadata?.recipient_phone || 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-white max-w-md truncate">
                              {log.subject || log.content.substring(0, 60)}
                              {log.content.length > 60 && '...'}
                            </div>
                            {log.error_message && (
                              <div className="text-xs text-red-400 mt-1 max-w-md truncate">
                                Error: {log.error_message}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                                log.status
                              )}`}
                            >
                              {getStatusIcon(log.status)}
                              {log.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {getProviderBadge(log.provider, log.type)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="px-4 py-4 border-t border-zinc-800 flex items-center justify-between">
                    <div className="text-sm text-gray-400">
                      Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of{' '}
                      {totalCount} logs
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                        className="flex items-center gap-1 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </button>
                      <div className="text-sm text-gray-400">
                        Page {page} of {totalPages}
                      </div>
                      <button
                        onClick={() => setPage(page + 1)}
                        disabled={page === totalPages}
                        className="flex items-center gap-1 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
