import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';
import QRCode from 'qrcode';
import { Menu, Plus, QrCode as QrIcon, Download, MapPin, Eye, Trash2 } from 'lucide-react';

interface QRCodeData {
  id: string;
  code: string;
  location_name: string | null;
  custom_url: string | null;
  scan_count: number;
  signup_count: number;
  active: boolean;
  created_at: string;
}

export default function QRCodes() {
  const { business } = useAuth();
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedQR, setSelectedQR] = useState<QRCodeData | null>(null);

  useEffect(() => {
    if (business) {
      loadQRCodes();
    }
  }, [business]);

  const loadQRCodes = async () => {
    if (!business) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setQrCodes(data);
    }
    setLoading(false);
  };

  const generateQRCode = async () => {
    if (!business) return;

    const code = `${business.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const { error } = await supabase.from('qr_codes').insert({
      business_id: business.id,
      code,
      location_name: locationName || null,
      custom_url: customUrl || null,
      scan_count: 0,
      signup_count: 0,
      active: true,
    });

    if (!error) {
      loadQRCodes();
      setShowAddModal(false);
      setLocationName('');
      setCustomUrl('');
    }
  };

  const downloadQRCode = async (code: string, locationName: string | null, customUrl: string | null) => {
    const qrUrl = customUrl || `${window.location.origin}/signup-form/${code}`;
    const canvas = document.createElement('canvas');

    await QRCode.toCanvas(canvas, qrUrl, {
      width: 512,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qr-code-${locationName || 'signup'}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  };

  const deleteQRCode = async (id: string) => {
    if (!confirm('Are you sure you want to delete this QR code?')) return;

    const { error } = await supabase.from('qr_codes').delete().eq('id', id);

    if (!error) {
      loadQRCodes();
    }
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
                  <h1 className="text-2xl font-bold text-white">QR Codes</h1>
                  <p className="text-gray-400 text-sm mt-1">
                    Generate sign-up QR codes for your locations
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Generate QR Code</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : qrCodes.length === 0 ? (
            <div className="text-center py-12">
              <QrIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-400 mb-2">No QR codes yet</h3>
              <p className="text-gray-500 mb-6">
                Generate your first QR code to start accepting customer sign-ups
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition"
              >
                <Plus className="w-5 h-5" />
                Generate QR Code
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {qrCodes.map((qr) => (
                <QRCodeCard
                  key={qr.id}
                  qrCode={qr}
                  onDownload={downloadQRCode}
                  onView={setSelectedQR}
                  onDelete={deleteQRCode}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-white">Generate QR Code</h2>
              <p className="text-sm text-gray-400 mt-1">
                Create a new sign-up QR code for your business
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  QR Code Name (or Location)
                </label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                  placeholder="Main Store, Front Counter, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Custom URL (Optional)
                </label>
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                  placeholder="https://example.com"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Leave empty to use the default signup form
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setLocationName('');
                    setCustomUrl('');
                  }}
                  className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={generateQRCode}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition"
                >
                  Generate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedQR && (
        <QRCodePreviewModal
          qrCode={selectedQR}
          onClose={() => setSelectedQR(null)}
          onDownload={downloadQRCode}
        />
      )}
    </div>
  );
}

function QRCodeCard({
  qrCode,
  onDownload,
  onView,
  onDelete,
}: {
  qrCode: QRCodeData;
  onDownload: (code: string, locationName: string | null, customUrl: string | null) => void;
  onView: (qr: QRCodeData) => void;
  onDelete: (id: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const qrUrl = qrCode.custom_url || `${window.location.origin}/signup-form/${qrCode.code}`;
      QRCode.toCanvas(canvasRef.current, qrUrl, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
    }
  }, [qrCode.code]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="p-6 bg-white flex items-center justify-center">
        <canvas ref={canvasRef} className="max-w-full" />
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          {qrCode.location_name ? (
            <>
              <MapPin className="w-4 h-4 text-orange-400" />
              <h3 className="text-white font-medium">{qrCode.location_name}</h3>
            </>
          ) : (
            <h3 className="text-gray-400 font-medium">General Sign-up</h3>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <p className="text-gray-400">Scans</p>
            <p className="text-white font-medium">{qrCode.scan_count}</p>
          </div>
          <div>
            <p className="text-gray-400">Sign-ups</p>
            <p className="text-orange-400 font-medium">{qrCode.signup_count}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onView(qrCode)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition text-sm"
          >
            <Eye className="w-4 h-4" />
            View
          </button>
          <button
            onClick={() => onDownload(qrCode.code, qrCode.location_name, qrCode.custom_url)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg transition text-sm"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          <button
            onClick={() => onDelete(qrCode.id)}
            className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function QRCodePreviewModal({
  qrCode,
  onClose,
  onDownload,
}: {
  qrCode: QRCodeData;
  onClose: () => void;
  onDownload: (code: string, locationName: string | null, customUrl: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const qrUrl = qrCode.custom_url || `${window.location.origin}/signup-form/${qrCode.code}`;
      QRCode.toCanvas(canvasRef.current, qrUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
    }
  }, [qrCode.code]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">
              {qrCode.location_name || 'General Sign-up'}
            </h2>
            <p className="text-sm text-gray-400 mt-1">QR Code Preview</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <span className="sr-only">Close</span>
            ×
          </button>
        </div>
        <div className="p-8 bg-white flex items-center justify-center">
          <canvas ref={canvasRef} className="max-w-full" />
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Scans</p>
              <p className="text-white text-2xl font-bold">{qrCode.scan_count}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Sign-ups</p>
              <p className="text-orange-400 text-2xl font-bold">{qrCode.signup_count}</p>
            </div>
          </div>
          <button
            onClick={() => onDownload(qrCode.code, qrCode.location_name, qrCode.custom_url)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition"
          >
            <Download className="w-5 h-5" />
            Download QR Code
          </button>
        </div>
      </div>
    </div>
  );
}
