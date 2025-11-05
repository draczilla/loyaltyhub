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
- **Supabase Auth** - Email/password authentication with Row Level Security
- **Supabase Edge Functions** - Serverless functions for SMS and email delivery
- **Brevo (Sendinblue)** - Transactional email and SMS delivery with tracking
- **Vonage** - SMS messaging with branded sender IDs
- **Stripe** - Payment processing and subscription management
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

## Multi-Tenant Architecture

LoyaltyHub is built with a comprehensive multi-tenant system that supports business isolation, team collaboration, and enterprise-grade verification.

### Tenant Management
- **Tenant Isolation** - Each business operates in a completely isolated environment with secure data separation
- **Team Collaboration** - Invite team members with role-based access control (Owner, Admin, Member)
- **Subscription Tiers** - Flexible pricing with Free, Pro, and Agency plans
- **Usage Tracking** - Monitor SMS and email credits, customer counts, and feature usage
- **White-Label Ready** - Customizable branding for agency clients

### Email and Phone Verification System

All new business accounts must verify both email and phone before accessing the platform:

#### Email Verification
- Automated welcome emails sent via Brevo with verification links
- 24-hour token expiration for security
- Rate limiting (3 attempts per hour) to prevent abuse
- Tracking of all verification attempts in audit logs
- Beautiful HTML email templates with branding

#### Phone Verification
- SMS verification codes sent via Vonage
- 10-minute code expiration
- Rate limiting (3 attempts per hour)
- Support for international phone numbers
- Verification required before dashboard access

#### Onboarding Flow
1. User signs up with email and password
2. Email verification sent automatically
3. After email verification, phone verification required
4. Full access granted after both verifications complete
5. Onboarding status tracked: `pending_email` → `pending_phone` → `completed`

### Communication Infrastructure

#### Brevo Integration (Email)
LoyaltyHub uses Brevo for all transactional emails:
- Welcome and verification emails
- Team invitation emails
- Password reset emails
- System alerts and notifications
- Email open/click tracking with pixel tracking
- Daily allowance tracking (300 emails/day default)

**Configuration**:
- `BREVO_API_KEY` - Brevo API key for email delivery
- `APP_URL` - Production domain for verification links (e.g., `https://loyaltyhub.no`)
- Sender email: `noreply@loyaltyhub.no` (must be verified in Brevo)

#### Vonage Integration (SMS)
LoyaltyHub uses Vonage for SMS messaging:
- Phone verification codes
- Transactional SMS notifications
- Marketing campaign messages
- Support for branded sender IDs

**Configuration**:
- `VONAGE_API_KEY` - Vonage API key
- `VONAGE_API_SECRET` - Vonage API secret
- `VONAGE_BRAND_NAME` - Sender name (e.g., "LoyaltyHub")

### Super Admin Portal

The platform includes a powerful super admin interface for platform management:

#### Features
- **Tenant Management** - View all businesses, subscription status, and usage metrics
- **Credit Management** - Allocate SMS/email credits and monitor consumption
- **Communication Logs** - Audit trail of all emails and SMS sent platform-wide
- **Brevo Balance Monitoring** - Real-time tracking of Brevo email credits
- **Platform Configuration** - Manage global settings, rate limits, and defaults
- **Test Communications** - Send test emails and SMS to verify configuration

#### Access Control
- Super admins tracked in dedicated `super_admins` table
- Role-based policies restrict access to sensitive operations
- All super admin actions logged for audit compliance

### Team Invitations

Businesses can invite team members to collaborate:

1. **Send Invitation** - Business owner/admin sends email invitation
2. **Email Delivery** - Invitation sent via Brevo with unique token
3. **Acceptance** - Invited user clicks link and creates account
4. **Role Assignment** - User added to team with specified role
5. **Access Granted** - Team member can access business dashboard

**Invitation Features**:
- Token expiration (7 days default)
- One-time use tokens
- Role selection: Owner, Admin, Member
- Automatic tenant association
- Email verification required before access

## Authentication

LoyaltyHub uses Supabase Auth with email/password authentication:

### Email/Password Authentication
- Secure password hashing with bcrypt
- Email and phone verification required for new accounts
- Password reset via email
- Session management with JWTs
- Row Level Security (RLS) policies enforce data isolation

### Security Features
- **Rate Limiting** - Protects against brute force attacks on verification endpoints
- **Token Expiration** - Email tokens expire in 24 hours, SMS codes in 10 minutes
- **Verification Tracking** - All verification attempts logged with results
- **Session Management** - Automatic token refresh and logout on expiration
- **RLS Policies** - Database-level security enforces tenant isolation

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

# Brevo Configuration (Email)
BREVO_API_KEY=your_brevo_api_key

# Vonage Configuration (SMS)
VONAGE_API_KEY=your_vonage_api_key
VONAGE_API_SECRET=your_vonage_api_secret
VONAGE_BRAND_NAME=LoyaltyHub

# Application Configuration
APP_URL=https://loyaltyhub.no
```

**Important**: For Supabase Edge Functions to access these credentials, you must also add them to your Supabase project:
- Go to Supabase Dashboard > Project Settings > Edge Functions > Secrets
- Add all environment variables listed above
- Verify sender email (`noreply@loyaltyhub.no`) in Brevo dashboard

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

### Core Tables
- **tenants** - Top-level business accounts with subscription management
- **businesses** - Business profiles and settings (linked to tenants)
- **tenant_members** - Team members with role-based access
- **tenant_invitations** - Pending team invitations with tokens
- **customers** - Customer profiles and contact information
- **loyalty_programs** - Reward program configurations
- **transactions** - Customer activity and point tracking
- **campaigns** - SMS campaign definitions
- **sms_templates** - Reusable message templates
- **email_templates** - Reusable email templates
- **subscription_tiers** - Plan definitions and limits

### Verification & Security
- **verification_tokens** - Email and phone verification tokens
- **verification_attempts** - Audit log of all verification attempts
- **communication_logs** - Complete log of all emails and SMS sent
- **email_tracking_pixels** - Track email opens with pixel tracking

### Platform Management
- **super_admins** - Platform administrators
- **platform_settings** - Global configuration
- **brevo_balance_logs** - Daily Brevo credit balance snapshots
- **daily_email_allowances** - Per-tenant daily email limits

All tables implement Row Level Security (RLS) policies to ensure data isolation and security.

## Subscription Tiers

### Free Tier
- 50 customers maximum
- 1 active loyalty program
- 50 SMS messages per month
- Basic analytics
- QR code generation
- Customer management

### Pro Tier ($29/month)
- 500 customers maximum
- 3 active loyalty programs
- 500 SMS messages per month
- 1,000 emails per month
- Advanced analytics
- Email campaigns
- Team collaboration (up to 3 members)
- Priority support

### Agency Tier ($99/month)
- Unlimited customers
- Unlimited loyalty programs
- 5,000 SMS messages per month
- 10,000 emails per month
- Advanced analytics
- White-label options
- Unlimited team members
- Custom domain support
- Dedicated support

## Contributing

This is a private project. For access or collaboration inquiries, please contact the project maintainers.

## License

All rights reserved. This software is proprietary and confidential.

## Support

For support inquiries, please contact support through the application or reach out to the development team.

---

Built with React, TypeScript, and Supabase. Designed for businesses that value customer relationships.
