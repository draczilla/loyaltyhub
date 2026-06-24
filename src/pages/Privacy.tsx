import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift } from 'lucide-react';

export default function Privacy() {
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
        <h1 className="text-4xl font-bold text-white mb-3">Privacy Policy</h1>
        <p className="text-gray-400 mb-10">Last updated: June 24, 2026</p>

        <div className="space-y-8 text-gray-300 leading-relaxed">

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
            <p>
              LoyaltyHub ("we", "our", or "us") is committed to protecting the personal data of our users. This Privacy Policy explains how we collect, use, disclose, and safeguard information when you use our platform at loyaltyhub.com and related services ("the Service").
            </p>
            <p className="mt-4">
              This policy applies to Merchants (businesses using LoyaltyHub) and, where applicable, to end customers of those businesses who access the Customer Portal. If you are a customer of a business using LoyaltyHub, your primary privacy relationship is with that business — LoyaltyHub processes your data on their behalf.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Data We Collect</h2>

            <h3 className="text-lg font-semibold text-white mb-3">2.1 Data You Provide (Merchant Accounts)</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong className="text-white">Account information:</strong> Company name, email address, password (hashed), phone number</li>
              <li><strong className="text-white">Billing information:</strong> Processed by Stripe. We do not store full card numbers or CVVs.</li>
              <li><strong className="text-white">Business profile:</strong> Company logo, address, website, VAT number, contact details</li>
              <li><strong className="text-white">Customer data you upload:</strong> Names, email addresses, phone numbers, birthdays, loyalty points, transaction history of your customers</li>
              <li><strong className="text-white">Communications:</strong> Messages you send via the SMS and email features</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mb-3 mt-6">2.2 Data Collected Automatically</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong className="text-white">Usage data:</strong> Pages visited, features used, time spent, actions taken within the platform</li>
              <li><strong className="text-white">Device and browser data:</strong> Browser type, operating system, IP address, time zone</li>
              <li><strong className="text-white">QR code scan data:</strong> Scan counts, sign-up counts per QR code</li>
              <li><strong className="text-white">Email tracking:</strong> Email open and click events for communications sent through the platform</li>
              <li><strong className="text-white">Session data:</strong> Authentication tokens, session duration</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Legal Basis for Processing (GDPR)</h2>
            <p>
              For users in the European Economic Area (EEA), we process your personal data on the following legal bases:
            </p>
            <div className="mt-4 space-y-4">
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
                <p className="text-white font-medium">Contract Performance</p>
                <p className="text-gray-400 text-sm mt-1">Processing necessary to provide the Service, manage your account, and process payments.</p>
              </div>
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
                <p className="text-white font-medium">Legitimate Interests</p>
                <p className="text-gray-400 text-sm mt-1">Service improvement, security monitoring, fraud prevention, and communications about your account or the Service.</p>
              </div>
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
                <p className="text-white font-medium">Legal Obligation</p>
                <p className="text-gray-400 text-sm mt-1">Compliance with applicable laws, tax obligations, and law enforcement requests.</p>
              </div>
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
                <p className="text-white font-medium">Consent</p>
                <p className="text-gray-400 text-sm mt-1">Marketing communications (where we require your consent) and non-essential cookies. You may withdraw consent at any time.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. How We Use Your Data</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Providing and operating the Service</li>
              <li>Processing payments and managing subscriptions</li>
              <li>Sending transactional emails (verification, invoices, password resets)</li>
              <li>Providing customer support</li>
              <li>Monitoring and improving platform performance and security</li>
              <li>Detecting and preventing fraud and abuse</li>
              <li>Sending product updates and feature announcements (you may unsubscribe at any time)</li>
              <li>Complying with legal obligations</li>
            </ul>
            <p className="mt-4">
              We do not sell your personal data or your customers' data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Data Sharing and Sub-Processors</h2>
            <p>
              We share data with the following trusted third-party providers ("sub-processors") who assist us in delivering the Service:
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm border border-zinc-800 rounded-lg overflow-hidden">
                <thead className="bg-zinc-900">
                  <tr>
                    <th className="text-left px-4 py-3 text-white font-medium">Provider</th>
                    <th className="text-left px-4 py-3 text-white font-medium">Purpose</th>
                    <th className="text-left px-4 py-3 text-white font-medium">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  <tr>
                    <td className="px-4 py-3 text-white">Supabase</td>
                    <td className="px-4 py-3 text-gray-400">Database, authentication, file storage</td>
                    <td className="px-4 py-3 text-gray-400">EU (AWS)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-white">Stripe</td>
                    <td className="px-4 py-3 text-gray-400">Payment processing, subscription management</td>
                    <td className="px-4 py-3 text-gray-400">USA / EU</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-white">Brevo (Sendinblue)</td>
                    <td className="px-4 py-3 text-gray-400">Transactional email and SMS delivery</td>
                    <td className="px-4 py-3 text-gray-400">EU (France)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-white">Netlify</td>
                    <td className="px-4 py-3 text-gray-400">Web hosting and CDN</td>
                    <td className="px-4 py-3 text-gray-400">USA / EU</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4">
              All sub-processors are bound by data processing agreements and required to maintain appropriate security standards. Where data is transferred outside the EEA, we ensure adequate safeguards are in place (Standard Contractual Clauses or equivalent).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Data Retention</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong className="text-white">Active accounts:</strong> Data retained for the duration of your subscription</li>
              <li><strong className="text-white">Cancelled accounts:</strong> Data retained for 90 days after cancellation, then permanently deleted</li>
              <li><strong className="text-white">Billing records:</strong> Retained for 7 years for accounting and legal compliance</li>
              <li><strong className="text-white">Communication logs:</strong> SMS and email logs retained for 12 months</li>
              <li><strong className="text-white">Backup data:</strong> Encrypted backups may be retained for up to 30 additional days</li>
            </ul>
            <p className="mt-4">
              You may export your data at any time via the platform. For tenant deletion, a data export option is available.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Your Rights (GDPR)</h2>
            <p>If you are located in the EEA, you have the following rights regarding your personal data:</p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { right: 'Right of Access', desc: 'Request a copy of your personal data' },
                { right: 'Right to Rectification', desc: 'Correct inaccurate or incomplete data' },
                { right: 'Right to Erasure', desc: 'Request deletion of your personal data' },
                { right: 'Right to Portability', desc: 'Receive your data in a machine-readable format' },
                { right: 'Right to Restrict Processing', desc: 'Limit how we use your data' },
                { right: 'Right to Object', desc: 'Object to processing based on legitimate interests' },
              ].map(({ right, desc }) => (
                <div key={right} className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
                  <p className="text-white font-medium text-sm">{right}</p>
                  <p className="text-gray-400 text-sm mt-1">{desc}</p>
                </div>
              ))}
            </div>
            <p className="mt-6">
              To exercise any of these rights, contact us at <a href="mailto:privacy@loyaltyhub.com" className="text-orange-400 hover:text-orange-300 underline">privacy@loyaltyhub.com</a>. We will respond within 30 days. You also have the right to lodge a complaint with your local data protection authority.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Security</h2>
            <p>
              We implement industry-standard technical and organisational measures to protect your data, including:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-3 ml-4">
              <li>Encryption of data in transit (TLS 1.2+) and at rest</li>
              <li>Row-level security (RLS) enforced at the database layer</li>
              <li>Hashed passwords using bcrypt (handled by Supabase Auth)</li>
              <li>Access controls limiting employee access to customer data</li>
              <li>Regular security reviews and monitoring</li>
            </ul>
            <p className="mt-4">
              While we take reasonable steps to protect your data, no system is completely secure. In the event of a data breach, we will notify affected users and relevant authorities as required by applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Cookies</h2>
            <p>
              We use cookies and similar technologies to operate the Service. For detailed information, please see our <a href="/cookies" className="text-orange-400 hover:text-orange-300 underline">Cookie Policy</a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Children's Privacy</h2>
            <p>
              The Service is not directed at individuals under 16 years of age. We do not knowingly collect personal data from children. If you believe we have inadvertently collected data from a child, please contact us and we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy periodically. We will notify you of significant changes by email or through a prominent notice on our platform. The "Last updated" date at the top reflects the most recent revision.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">12. Contact Us</h2>
            <p>
              For privacy-related enquiries, data subject requests, or to reach our Data Protection Officer:
            </p>
            <div className="mt-4 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
              <p className="text-white font-medium">LoyaltyHub — Data Protection</p>
              <p className="text-gray-400 mt-1">Email: <a href="mailto:privacy@loyaltyhub.com" className="text-orange-400 hover:text-orange-300">privacy@loyaltyhub.com</a></p>
              <p className="text-gray-400">General: <a href="mailto:support@loyaltyhub.com" className="text-orange-400 hover:text-orange-300">support@loyaltyhub.com</a></p>
            </div>
          </section>

        </div>
      </main>

      <footer className="border-t border-zinc-800 mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex flex-wrap gap-6 justify-between items-center">
          <p className="text-gray-500 text-sm">© 2026 LoyaltyHub. All rights reserved.</p>
          <div className="flex gap-6 text-sm">
            <a href="/terms" className="text-gray-400 hover:text-white transition">Terms</a>
            <a href="/privacy" className="text-orange-400 hover:text-orange-300 transition">Privacy</a>
            <a href="/cookies" className="text-gray-400 hover:text-white transition">Cookies</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
