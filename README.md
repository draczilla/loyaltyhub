# LoyaltyHub

**Turn First-Time Visitors Into Loyal Customers**

LoyaltyHub is a comprehensive customer loyalty management platform that helps businesses create powerful reward programs, track customer engagement, and drive repeat business. With QR code-based enrollment and no app downloads required, it removes friction from the customer experience while giving businesses powerful tools to build lasting relationships.

## Overview

LoyaltyHub solves a critical challenge for modern businesses: converting one-time customers into repeat visitors. Traditional loyalty programs require customers to download apps or carry physical cards, creating barriers to participation. LoyaltyHub eliminates this friction with instant QR code enrollment and SMS-based engagement, making it effortless for customers to join and for businesses to reward loyalty.

The platform is built for businesses of all sizes, from small local shops to large agencies managing multiple clients. With flexible reward types, automated campaigns, and detailed analytics, LoyaltyHub provides everything needed to create and manage successful loyalty programs.

## Feature Highlights

### Multiple Reward Program Types
Create diverse loyalty programs tailored to your business model:
- **Points Programs** - Customers earn points per dollar spent and redeem for rewards
- **Stamp Cards** - Digital punch cards for buy-X-get-one-free promotions
- **Rebate Codes** - Generate unique discount codes for customer rewards
- **Percentage Discounts** - Offer tiered discounts based on customer loyalty
- **Free Items** - Reward customers with complimentary products or services

### QR Code Customer Enrollment
- Customers join instantly by scanning a QR code at your business
- No app downloads or account creation required
- Seamless onboarding experience that maximizes participation
- Generate unlimited QR codes for different locations or campaigns

### Customer Management
- Centralized dashboard to view all customer activity
- Track reward progress, transaction history, and engagement metrics
- Manually add customers or let them self-register via QR codes
- Segment customers based on behavior and preferences
- Export customer data for external analysis

### SMS Campaign System
- Send targeted promotions and updates directly to customers
- Create reusable SMS templates for consistent messaging
- Track campaign performance and engagement rates
- Automated transactional SMS for reward notifications
- Monthly SMS allowances based on subscription tier

### Email Integration
- Sync customer data with MailChimp for email campaigns
- Leverage existing email marketing workflows
- Combine SMS and email for multi-channel engagement
- Automated email notifications for program milestones

### Analytics and Reporting
- Real-time dashboard with key performance metrics
- Track total customers, active programs, and transaction volume
- Monitor new customer acquisition trends
- Measure program effectiveness and ROI
- Identify top-performing campaigns and customer segments

### Multi-Tenant Architecture
- Super admin portal for managing multiple business accounts
- Subscription tier management with usage tracking
- SMS credit allocation and monitoring
- White-label capabilities for agency clients
- Tenant-specific configuration and branding

## Technology Stack

### Frontend
- **React 18** - Modern UI library with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first styling framework
- **React Router** - Client-side routing
- **Lucide React** - Beautiful icon library

### Backend & Services
- **Supabase** - PostgreSQL database with real-time capabilities
- **Supabase Auth** - Email/password and Google OAuth authentication with Row Level Security
- **Supabase Edge Functions** - Serverless functions for SMS and email delivery
- **SendGrid** - Transactional email delivery with tracking
- **Twilio** - SMS messaging with alphanumeric sender IDs
- **QRCode** - Dynamic QR code generation

### Key Libraries
- `@supabase/supabase-js` - Supabase client library
- `react-router-dom` - Navigation and routing
- `qrcode` - QR code generation
- `lucide-react` - Icon components

## Benefits and Use Cases

### For Small Businesses
- **Increase Repeat Customers** - Reward loyalty to drive repeat visits and higher lifetime value
- **Quick Setup** - Launch your first loyalty program in minutes with intuitive tools
- **Affordable** - Free tier available with upgrade options as you grow
- **No Technical Skills Required** - User-friendly interface designed for non-technical users

### For Growing Businesses
- **Scale Effortlessly** - Handle hundreds of customers and multiple concurrent programs
- **Data-Driven Decisions** - Analytics help optimize programs for maximum impact
- **Multi-Channel Marketing** - Combine SMS and email for comprehensive outreach
- **Professional Features** - Advanced segmentation, campaign scheduling, and reporting

### For Agencies
- **Manage Multiple Clients** - Single platform to oversee all client loyalty programs
- **White-Label Options** - Customize branding for your agency and clients
- **Unlimited Programs** - Create diverse programs for different client needs
- **High SMS Volume** - Agency tier includes 5,000+ monthly SMS messages
- **Priority Support** - Dedicated support for agency partners

### Key Advantages
- **No App Required** - Customers join via QR code scan, eliminating download friction
- **Instant Enrollment** - Sign-ups take seconds, maximizing program participation
- **SMS-First Approach** - Reach customers directly on the devices they always have
- **Enterprise Security** - Built on Supabase with automatic backups and RLS policies
- **Mobile Responsive** - Works perfectly on all devices from desktop to mobile

## Twilio Integration

LoyaltyHub uses Twilio for SMS messaging with Alphanumeric Sender IDs. The platform supports two credential models:

### Platform-Level Credentials (Fallback)
Configure platform-wide Twilio credentials that all businesses can use by default:

1. Add your Twilio credentials to the `.env` file:
   - `TWILIO_ACCOUNT_SID` - Your Twilio Account SID
   - `TWILIO_AUTH_TOKEN` - Your Twilio Auth Token
   - `TWILIO_SENDER_ID` - Your alphanumeric sender ID (3-11 characters, letters and numbers only)

2. Add the same credentials to Supabase Edge Function secrets:
   - Navigate to Supabase Dashboard > Project Settings > Edge Functions > Secrets
   - Add all three Twilio environment variables
   - These secrets allow the `send-transactional-sms` function to access credentials

### Alphanumeric Sender ID Information

Alphanumeric Sender IDs allow you to send SMS messages with a custom branded name instead of a phone number:

- **Requirements**: 3-11 characters, alphanumeric only (A-Z, a-z, 0-9), no spaces or special characters
- **Examples**: YourBrand, MyStore, LoyaltyHub, Shop123
- **One-way messaging**: Customers cannot reply to messages sent from alphanumeric sender IDs
- **Country restrictions**: May require pre-registration in some countries (check Twilio's documentation for your target region)
- **Fallback**: If the sender ID is not supported in the recipient's country, Twilio may use a shared short code or long code instead

### Business-Specific Credentials (Priority)
Businesses can optionally configure their own Twilio accounts through the integrations table in the database. When present, business-specific credentials take priority over platform-level credentials. Business integrations support both alphanumeric sender IDs and phone numbers for backward compatibility.

### Credential Priority
The SMS system checks for credentials in this order:
1. **Business Integration** - Checks the `integrations` table for active Twilio credentials
2. **Platform Fallback** - Uses platform-level environment variables if no business integration exists

This flexibility allows you to provide a default SMS service while letting businesses use their own Twilio accounts for greater control and cost management.

## Authentication

LoyaltyHub supports multiple authentication methods:

### Email/Password Authentication
Traditional email and password signup with secure password hashing and email verification support.

### Google OAuth
Users can sign in with their Google accounts for a seamless onboarding experience.

#### Setting up Google OAuth

1. **Create Google OAuth Credentials**:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Navigate to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client ID"
   - Configure the OAuth consent screen if not already done
   - Select "Web application" as the application type
   - Add authorized JavaScript origins:
     - `http://localhost:5173` (for local development)
     - Your production domain (e.g., `https://yourdomain.com`)
   - Add authorized redirect URIs:
     - `http://localhost:54321/auth/v1/callback` (for local Supabase)
     - `https://your-project-ref.supabase.co/auth/v1/callback` (for production)
   - Copy the Client ID and Client Secret

2. **Configure Supabase**:
   - Go to your Supabase Dashboard
   - Navigate to "Authentication" > "Providers"
   - Find "Google" in the list and enable it
   - Enter your Google Client ID and Client Secret
   - Save the configuration

3. **Update Redirect URLs** (if needed):
   - In the Supabase dashboard, go to "Authentication" > "URL Configuration"
   - Ensure your site URL and redirect URLs are properly configured

#### How It Works

When users click "Sign in with Google":
1. They're redirected to Google's OAuth consent screen
2. After authorizing, they're redirected back to your app
3. If it's their first time signing in, a business account is automatically created with:
   - Company name derived from their Google display name
   - Email from their Google account
   - Free tier subscription
4. They're automatically logged in and redirected to the dashboard

## Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn package manager
- Supabase account (free tier available)
- Twilio account (for SMS functionality)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd loyaltyhub
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:

Create a `.env` file in the root directory (or copy from `.env.example`):

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Twilio Configuration (Platform-Level)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_SENDER_ID=your_alphanumeric_sender_id
```

**Important**: For Supabase Edge Functions to access Twilio credentials, you must also add them to your Supabase project:
- Go to Supabase Dashboard > Project Settings > Edge Functions > Secrets
- Add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_SENDER_ID`

4. Run the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

### Run Type Checking

```bash
npm run typecheck
```

## Project Structure

```
loyaltyhub/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Sidebar.tsx
│   │   ├── SuperAdminSidebar.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── SuperAdminProtectedRoute.tsx
│   │   └── AddCustomerModal.tsx
│   ├── contexts/            # React context providers
│   │   └── AuthContext.tsx  # Authentication state management
│   ├── lib/                 # Utility libraries
│   │   ├── supabase.ts      # Supabase client configuration
│   │   └── transactionalSms.ts  # SMS sending utilities
│   ├── pages/               # Application pages
│   │   ├── Landing.tsx      # Public landing page
│   │   ├── Login.tsx        # Authentication
│   │   ├── SignUp.tsx       # User registration
│   │   ├── Dashboard.tsx    # Main dashboard
│   │   ├── Customers.tsx    # Customer management
│   │   ├── Programs.tsx     # Loyalty program management
│   │   ├── QRCodes.tsx      # QR code generation
│   │   ├── Campaigns.tsx    # SMS campaign management
│   │   ├── Analytics.tsx    # Reporting and analytics
│   │   ├── SmsTemplates.tsx # SMS template management
│   │   ├── SuperAdminDashboard.tsx
│   │   ├── SuperAdminTenants.tsx
│   │   ├── SuperAdminConfig.tsx
│   │   └── SuperAdminCredits.tsx
│   ├── App.tsx              # Main application component
│   ├── main.tsx             # Application entry point
│   └── index.css            # Global styles
├── supabase/
│   ├── migrations/          # Database migrations
│   └── functions/           # Edge functions
│       └── send-transactional-sms/
└── public/                  # Static assets
```

## Database Schema

The application uses Supabase PostgreSQL with the following core tables:

- **businesses** - Business account information and subscription details
- **customers** - Customer profiles and contact information
- **loyalty_programs** - Reward program configurations
- **transactions** - Customer activity and point tracking
- **campaigns** - SMS campaign definitions
- **sms_templates** - Reusable message templates
- **subscription_tiers** - Plan definitions and limits

All tables implement Row Level Security (RLS) policies to ensure data isolation and security.

## Subscription Tiers

### Free Tier
- 50 customers maximum
- 1 active loyalty program
- 50 SMS messages per month
- Basic analytics
- QR code generation
- Customer management

### Pro Tier
- 500 customers maximum
- 3 active loyalty programs
- 500 SMS messages per month
- Advanced analytics
- MailChimp integration
- Email campaigns
- Priority support

### Agency Tier
- Unlimited customers
- Unlimited loyalty programs
- 5,000 SMS messages per month
- Advanced analytics
- White-label options
- Custom domain support
- MailChimp integration
- Priority support

## Contributing

This is a private project. For access or collaboration inquiries, please contact the project maintainers.

## License

All rights reserved. This software is proprietary and confidential.

## Support

For support inquiries, please contact support through the application or reach out to the development team.

---

Built with React, TypeScript, and Supabase. Designed for businesses that value customer relationships.
