# Netlify Environment Variables Setup via Bolt

## Issue
The production deployment is failing because environment variables are not configured in Netlify.

Error: `Missing Supabase environment variables`

## Solution
You need to add environment variables through Bolt's deployment interface.

### Required Environment Variables

Add these environment variables to your Netlify deployment:

```
VITE_SUPABASE_URL=https://ybpgfkieomtsftbuadba.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlicGdma2llb210c2Z0YnVhZGJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNTczOTUsImV4cCI6MjA3NjczMzM5NX0.ADd3SJDiayCcSUUJz2KeygN5pLabUQmugeH-SqVVpN0
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51SNJEdGXNuwZuN7zUbIWLHgmvVb3gamJ0OMtDUtwFH6Dy6svVofgQ6Yi0BTikwXgQeRCNdpFBWYsjHFcpJlKfPXP00HduAH6DH
```

### How to Add via Bolt

1. In Bolt, look for deployment settings or environment configuration
2. Add each variable with its corresponding value
3. Trigger a new deployment after adding the variables

### Alternative: Direct Netlify Access

If Bolt provides a link to your Netlify dashboard:

1. Go to your Netlify site dashboard
2. Navigate to: **Site settings** → **Environment variables**
3. Click **Add a variable** for each one above
4. Set the scope to **All deploy contexts** or **Production**
5. Click **Save**
6. Redeploy your site

### After Configuration

Once the environment variables are set:
- The site will load properly
- Supabase connection will work
- All features will be functional

### Note

The `.env` file in your project is only used for local development. Production deployments require environment variables to be configured in the hosting platform (Netlify).
