import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift } from 'lucide-react';

export default function Terms() {
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
        <h1 className="text-4xl font-bold text-white mb-3">Terms of Service</h1>
        <p className="text-gray-400 mb-10">Last updated: June 24, 2026</p>

        <div className="prose prose-invert max-w-none space-y-8 text-gray-300 leading-relaxed">

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing or using LoyaltyHub ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service. These Terms apply to all users, including businesses ("Merchants") and their end customers accessing the Customer Portal.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Description of Service</h2>
            <p>
              LoyaltyHub is a software-as-a-service (SaaS) platform that enables businesses to create, manage, and operate customer loyalty programs. The Service includes:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-3 ml-4">
              <li>Customer loyalty program creation and management (points, stamp cards, rewards, discounts)</li>
              <li>Customer relationship management tools</li>
              <li>SMS and email communication capabilities</li>
              <li>QR code generation and tracking</li>
              <li>Analytics and reporting dashboards</li>
              <li>Customer-facing portal for reward redemption</li>
              <li>Team and multi-location management</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Account Registration</h2>
            <p>
              To use the Service, you must create an account by providing accurate, complete, and current information. You are responsible for:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-3 ml-4">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized access</li>
              <li>Ensuring your registered email address remains valid and accessible</li>
            </ul>
            <p className="mt-4">
              You must be at least 18 years old and have the authority to enter into these Terms on behalf of your business to register an account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Subscription Plans and Billing</h2>
            <p>
              LoyaltyHub offers multiple subscription tiers. By selecting a paid plan, you agree to the following:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-3 ml-4">
              <li><strong className="text-white">Free Trial:</strong> New accounts receive a 30-day free trial with access to paid plan features. No credit card is required during the trial period.</li>
              <li><strong className="text-white">Billing Cycle:</strong> Subscriptions are billed monthly in advance. Payments are processed via Stripe.</li>
              <li><strong className="text-white">Automatic Renewal:</strong> Subscriptions automatically renew unless cancelled at least 24 hours before the renewal date.</li>
              <li><strong className="text-white">Price Changes:</strong> We will provide at least 30 days' notice of price changes. Continued use after the notice period constitutes acceptance.</li>
              <li><strong className="text-white">Refunds:</strong> Monthly subscription fees are non-refundable. If you cancel mid-period, your access continues until the end of the paid period.</li>
              <li><strong className="text-white">SMS Credits:</strong> SMS credits are consumed as messages are sent and do not roll over between billing periods unless stated otherwise in your plan.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Acceptable Use</h2>
            <p>You agree not to use the Service to:</p>
            <ul className="list-disc list-inside space-y-2 mt-3 ml-4">
              <li>Send unsolicited commercial messages (spam) to customers who have not opted in</li>
              <li>Violate any applicable laws, including consumer protection, anti-spam, and data protection laws</li>
              <li>Collect or process personal data in violation of applicable privacy laws</li>
              <li>Impersonate another business or person</li>
              <li>Attempt to gain unauthorized access to the Service or other users' accounts</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
              <li>Use the Service to send threatening, abusive, or harmful content</li>
              <li>Engage in any activity that disrupts or impairs the Service's performance</li>
            </ul>
            <p className="mt-4">
              We reserve the right to suspend or terminate accounts that violate these terms without refund.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Customer Data and Privacy</h2>
            <p>
              As a Merchant using LoyaltyHub, you act as a data controller for your customers' personal data. You are responsible for:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-3 ml-4">
              <li>Obtaining valid consent from your customers before collecting their personal data</li>
              <li>Providing your customers with a privacy notice explaining how their data is used</li>
              <li>Complying with applicable data protection laws (including GDPR where applicable)</li>
              <li>Responding to data subject requests from your customers</li>
              <li>Notifying us promptly of any data breach affecting customer data</li>
            </ul>
            <p className="mt-4">
              LoyaltyHub acts as a data processor on your behalf. Our handling of your customers' data is governed by our <a href="/privacy" className="text-orange-400 hover:text-orange-300 underline">Privacy Policy</a> and any Data Processing Agreement you enter into with us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. SMS and Email Communications</h2>
            <p>
              When using the SMS and email features, you agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-3 ml-4">
              <li>Only send communications to customers who have explicitly opted in to receive them</li>
              <li>Provide a clear and easy mechanism for customers to opt out</li>
              <li>Comply with applicable regulations including CAN-SPAM, TCPA (US), and GDPR (EU)</li>
              <li>Not use the Service to send messages that are deceptive, fraudulent, or violate any law</li>
              <li>Honour opt-out requests promptly (within 10 business days for email, immediately for SMS)</li>
            </ul>
            <p className="mt-4">
              You acknowledge that SMS and email delivery is subject to third-party provider limitations and is not guaranteed. We are not liable for non-delivery of messages.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Intellectual Property</h2>
            <p>
              LoyaltyHub and its licensors retain all intellectual property rights in the Service, including software, designs, logos, and documentation. You are granted a limited, non-exclusive, non-transferable licence to use the Service during your subscription period.
            </p>
            <p className="mt-4">
              You retain ownership of all content and data you upload to the Service, including your company logo, customer data, and loyalty program configurations. By uploading content, you grant us a limited licence to use it solely to provide the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Service Availability and Uptime</h2>
            <p>
              We aim to provide a reliable service but do not guarantee uninterrupted access. Scheduled maintenance will be communicated in advance where possible. We are not liable for any losses arising from downtime, outages, or service interruptions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, LoyaltyHub shall not be liable for:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-3 ml-4">
              <li>Indirect, incidental, special, or consequential damages</li>
              <li>Loss of revenue, profits, data, or business opportunities</li>
              <li>Damages arising from your use or inability to use the Service</li>
              <li>Actions or omissions of third-party providers (Stripe, Brevo, SMS carriers)</li>
            </ul>
            <p className="mt-4">
              Our total liability to you for any claim shall not exceed the total fees paid by you in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">11. Termination</h2>
            <p>
              You may cancel your subscription at any time through the Subscription page in your account settings. Upon cancellation:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-3 ml-4">
              <li>Your access continues until the end of your current billing period</li>
              <li>Your data will be retained for 90 days after cancellation, after which it will be deleted</li>
              <li>You may export your customer data at any time before deletion</li>
            </ul>
            <p className="mt-4">
              We reserve the right to suspend or terminate your account immediately for violations of these Terms, with or without notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">12. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. We will notify you of material changes by email at least 30 days before they take effect. Your continued use of the Service after the effective date constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">13. Governing Law</h2>
            <p>
              These Terms are governed by and construed in accordance with the laws of Norway, without regard to conflict of law principles. Any disputes shall be resolved in the courts of Norway.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">14. Contact</h2>
            <p>
              For questions about these Terms, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
              <p className="text-white font-medium">LoyaltyHub</p>
              <p className="text-gray-400 mt-1">Email: <a href="mailto:legal@loyaltyhub.com" className="text-orange-400 hover:text-orange-300">legal@loyaltyhub.com</a></p>
              <p className="text-gray-400">Support: <a href="mailto:support@loyaltyhub.com" className="text-orange-400 hover:text-orange-300">support@loyaltyhub.com</a></p>
            </div>
          </section>

        </div>
      </main>

      <footer className="border-t border-zinc-800 mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex flex-wrap gap-6 justify-between items-center">
          <p className="text-gray-500 text-sm">© 2026 LoyaltyHub. All rights reserved.</p>
          <div className="flex gap-6 text-sm">
            <a href="/terms" className="text-orange-400 hover:text-orange-300 transition">Terms</a>
            <a href="/privacy" className="text-gray-400 hover:text-white transition">Privacy</a>
            <a href="/cookies" className="text-gray-400 hover:text-white transition">Cookies</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
