#!/bin/bash

# Cleanup script for all orphaned auth users
# These users remain after their tenants were deleted

SUPABASE_URL="https://ybpgfkieomtsftbuadba.supabase.co"

# User IDs to delete (orphaned auth users)
USER_IDS='["0a5af4ea-9050-446f-b097-797843775bbf","8a9aea08-4bfa-4196-adfb-2a8d1457f0cd","86284911-fbd5-48a9-a915-678f6f265309","5f11b526-9226-4bfb-b5b8-e2ce156496e5","f18418a3-70eb-4b1a-b5c1-9fe074ebc1a0","9952bd8d-a45d-44c0-8c0d-0ea9b6204809"]'

echo "🧹 Cleaning up 6 orphaned auth users..."
echo ""
echo "Orphaned users to delete:"
echo "  - admin@adaptiq.no (0a5af4ea-9050-446f-b097-797843775bbf)"
echo "  - karl@driftpartner.no (8a9aea08-4bfa-4196-adfb-2a8d1457f0cd)"
echo "  - karl@vikenkommunikasjon.no (86284911-fbd5-48a9-a915-678f6f265309)"
echo "  - trymgamermail@gmail.com (5f11b526-9226-4bfb-b5b8-e2ce156496e5)"
echo "  - karl@adaptiq.no (f18418a3-70eb-4b1a-b5c1-9fe074ebc1a0)"
echo "  - steen71@gmail.com (9952bd8d-a45d-44c0-8c0d-0ea9b6204809)"
echo ""
echo "Protected users (will NOT be deleted):"
echo "  - karl@medias.no"
echo "  - gyldenhorn@gmail.com"
echo ""

# Check if SUPER_ADMIN_TOKEN is set
if [ -z "$SUPER_ADMIN_TOKEN" ]; then
  echo "❌ Error: SUPER_ADMIN_TOKEN environment variable is not set"
  echo ""
  echo "To get your token:"
  echo "1. Login to the app as a super admin (karl@medias.no or gyldenhorn@gmail.com)"
  echo "2. Open browser DevTools → Application/Storage → Local Storage"
  echo "3. Find the Supabase auth token"
  echo "4. Run: export SUPER_ADMIN_TOKEN='your_token_here'"
  echo "5. Then run this script again"
  exit 1
fi

echo "Calling cleanup-orphaned-auth-users edge function..."
echo ""

curl -X POST "${SUPABASE_URL}/functions/v1/cleanup-orphaned-auth-users" \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"mode\": \"cleanup\", \"userIds\": ${USER_IDS}}" \
  | python3 -m json.tool

echo ""
echo "✅ Cleanup complete!"
