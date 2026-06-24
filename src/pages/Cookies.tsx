import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift } from 'lucide-react';

export default function Cookies() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-800 sticky top-0 bg-black/90 backdrop-blur-sm z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-white transition flex items-center gap-2 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <Gift className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white">LoyaltyHub</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-4xl font-bold text-white mb-3">Cookie Policy</h1>
        <p className="text-gray-400 mb-10">Last updated: June 24, 2026</p>

        <div className="space-y-8 text-gray-300 leading-relaxed">

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. What Are Cookies?</h2>
            <p>
              Cookies are small text files placed on your device when you visit a website. They allow the site to remember your preferences, authenticate your session, and understand how you use the service. Similar technologies include local storage, session storage, and pixels.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. How LoyaltyHub Uses Cookies</h2>
            <p>
              LoyaltyHub uses a minimal set of cookies and browser storage. We do not use advertising cookies, tracking pixels for third-party ad networks, or fingerprinting technologies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Types of Cookies We Use</h2>

            <div className="space-y-4 mt-4">
              <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">Strictly Necessary</h3>
                  <span className="px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium rounded-full">Always Active</span>
                </div>
                <p className="text-gray-400 text-sm mb-3">
                  These cookies are essential for the platform to function. They cannot be disabled. Without them, core features like logging in would not work.
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="text-left py-2 text-gray-400 font-medium">Name</th>
                      <th className="text-left py-2 text-gray-400 font-medium">Provider</th>
                      <th className="text-left py-2 text-gray-400 font-medium">Purpose</th>
                      <th className="text-left py-2 text-gray-400 font-medium">Expiry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    <tr>
                      <td className="py-2 text-white font-mono text-xs">sb-*-auth-token</td>
                      <td className="py-2 text-gray-400">Supabase</td>
                      <td className="py-2 text-gray-400">Authentication session token</td>
                      <td className="py-2 text-gray-400">Session</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-white font-mono text-xs">auth_state</td>
                      <td className="py-2 text-gray-400">LoyaltyHub</td>
                      <td className="py-2 text-gray-400">Cached auth state (sessionStorage)</td>
                      <td className="py-2 text-gray-400">Session</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-white font-mono text-xs">cookie_consent</td>
                      <td className="py-2 text-gray-400">LoyaltyHub</td>
                      <td className="py-2 text-gray-400">Stores your cookie consent preference</td>
                      <td className="py-2 text-gray-400">1 year</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-white font-mono text-xs">customer_session</td>
                      <td className="py-2 text-gray-400">LoyaltyHub</td>
                      <td className="py-2 text-gray-400">Customer portal session (sessionStorage)</td>
                      <td className="py-2 text-gray-400">Session</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">Functional</h3>
                  <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium rounded-full">Optional</span>
                </div>
                <p className="text-gray-400 text-sm mb-3">
                  These cookies enable enhanced functionality such as remembering your preferences. Disabling them may affect your experience.
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="text-left py-2 text-gray-400 font-medium">Name</th>
                      <th className="text-left py-2 text-gray-400 font-medium">Provider</th>
                      <th className="text-left py-2 text-gray-400 font-medium">Purpose</th>
                      <th className="text-left py-2 text-gray-400 font-medium">Expiry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    <tr>
                      <td className="py-2 text-white font-mono text-xs">__stripe_mid</td>
                      <td className="py-2 text-gray-400">Stripe</td>
                      <td className="py-2 text-gray-400">Fraud prevention for payments</td>
                      <td className="py-2 text-gray-400">1 year</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-white font-mono text-xs">__stripe_sid</td>
                      <td className="py-2 text-gray-400">Stripe</td>
                      <td className="py-2 text-gray-400">Secure checkout session</td>
                      <td className="py-2 text-gray-400">30 min</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">Analytics</h3>
                  <span className="px-3 py-1 bg-zinc-700 border border-zinc-600 text-zinc-300 text-xs font-medium rounded-full">Not Used</span>
                </div>
                <p className="text-gray-400 text-sm">
                  We currently do not use third-party analytics cookies (such as Google Analytics). All usage analytics are derived from our own first-party data stored in our database.
                </p>
              </div>

              <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">Advertising / Targeting</h3>
                  <span className="px-3 py-1 bg-zinc-700 border border-zinc-600 text-zinc-300 text-xs font-medium rounded-full">Not Used</span>
                </div>
                <p className="text-gray-400 text-sm">
                  We do not use advertising cookies, retargeting pixels, or social media tracking cookies. We do not share data with advertising networks.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Managing Your Cookie Preferences</h2>
            <p>
              When you first visit LoyaltyHub, a consent banner will allow you to accept or decline optional cookies. You can change your preferences at any time by clearing your browser's cookies and revisiting the site.
            </p>
            <p className="mt-4">You can also manage cookies through your browser settings:</p>
            <ul className="list-disc list-inside space-y-2 mt-3 ml-4">
              <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 underline">Google Chrome</a></li>
              <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 underline">Mozilla Firefox</a></li>
              <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 underline">Safari</a></li>
              <li><a href="https://support.microsoft.com/en-us/windows/manage-cookies-in-microsoft-edge" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 underline">Microsoft Edge</a></li>
            </ul>
            <p className="mt-4 text-sm text-gray-400">
              Note: Disabling strictly necessary cookies (such as session tokens) will prevent you from logging in and using the platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Updates to This Policy</h2>
            <p>
              We may update this Cookie Policy when we add new features or change our use of cookies. The "Last updated" date above reflects the current version. Continued use of the platform after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Contact</h2>
            <p>
              For questions about our use of cookies:
            </p>
            <div className="mt-4 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
              <p className="text-white font-medium">LoyaltyHub</p>
              <p className="text-gray-400 mt-1">Email: <a href="mailto:privacy@loyaltyhub.com" className="text-orange-400 hover:text-orange-300">privacy@loyaltyhub.com</a></p>
            </div>
          </section>

        </div>
      </main>

      <footer className="border-t border-zinc-800 mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex flex-wrap gap-6 justify-between items-center">
          <p className="text-gray-500 text-sm">© 2026 LoyaltyHub. All rights reserved.</p>
          <div className="flex gap-6 text-sm">
            <a href="/terms" className="text-gray-400 hover:text-white transition">Terms</a>
            <a href="/privacy" className="text-gray-400 hover:text-white transition">Privacy</a>
            <a href="/cookies" className="text-orange-400 hover:text-orange-300 transition">Cookies</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
