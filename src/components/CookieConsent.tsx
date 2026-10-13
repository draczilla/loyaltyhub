import { useState, useEffect } from 'react';
import { X, Cookie, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

const CONSENT_KEY = 'cookie_consent';
const CONSENT_VERSION = '1';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) {
      // Small delay so it doesn't flash on page load
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const respond = (choice: 'accepted' | 'declined') => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ choice, version: CONSENT_VERSION, date: new Date().toISOString() }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6"
      role="dialog"
      aria-label="Cookie consent"
      aria-modal="false"
    >
      <div className="max-w-3xl mx-auto bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <Cookie className="w-5 h-5 text-orange-400" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-white font-semibold text-base mb-1">We use cookies</h2>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    We use strictly necessary cookies to keep you logged in, plus optional Stripe cookies for secure payment processing. We don't use advertising or tracking cookies.{' '}
                    <Link to="/cookies" className="text-orange-400 hover:text-orange-300 underline">
                      Learn more
                    </Link>
                  </p>
                </div>
                <button
                  onClick={() => respond('declined')}
                  className="text-gray-500 hover:text-gray-300 transition flex-shrink-0 mt-0.5"
                  aria-label="Close without accepting"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {showDetails && (
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between p-3 bg-black/40 rounded-lg">
                    <div>
                      <p className="text-white font-medium">Strictly Necessary</p>
                      <p className="text-gray-500 text-xs mt-0.5">Session tokens, auth state — required to use the platform</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-green-400 text-xs font-medium">
                      <Shield className="w-3.5 h-3.5" />
                      Always on
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-black/40 rounded-lg">
                    <div>
                      <p className="text-white font-medium">Functional (Stripe)</p>
                      <p className="text-gray-500 text-xs mt-0.5">Fraud prevention for payment checkout only</p>
                    </div>
                    <span className="text-gray-400 text-xs">Optional</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-black/40 rounded-lg">
                    <div>
                      <p className="text-white font-medium">Analytics / Advertising</p>
                      <p className="text-gray-500 text-xs mt-0.5">Not used</p>
                    </div>
                    <span className="text-zinc-600 text-xs">None</span>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 mt-4">
                <button
                  onClick={() => respond('accepted')}
                  className="px-5 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-sm font-medium rounded-lg transition"
                >
                  Accept all
                </button>
                <button
                  onClick={() => respond('declined')}
                  className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-sm font-medium rounded-lg transition"
                >
                  Essential only
                </button>
                <button
                  onClick={() => setShowDetails(v => !v)}
                  className="text-gray-400 hover:text-white text-sm transition underline underline-offset-2"
                >
                  {showDetails ? 'Hide details' : 'Cookie details'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
