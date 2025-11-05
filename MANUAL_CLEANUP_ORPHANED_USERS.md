# Manual Cleanup of Orphaned Auth Users

## Status: 3 Tenants Deleted ✅

### Deleted Tenants:
1. ✅ **Viken Kommunikasjon** (93de4219-104b-4645-b375-ed2b6f64b616)
2. ✅ **AdaptIQ AS** (567ae861-82d0-4b3d-b84a-c3c69ca24aa3)
3. ✅ **Adaptiq** (e00b3e86-c86a-4bbf-9896-8f3a6ec9221d)

### Protected Users (NOT deleted):
- ✅ **karl@medias.no** (e18287b1-a0eb-4ec9-bf05-c01bad711631)
- ✅ **gyldenhorn@gmail.com** (66ae1e69-d343-40f3-8d2c-1cc2ef86a812)

---

## Remaining Task: Clean Up 6 Orphaned Auth Users

These auth users remain in `auth.users` but have no database records:

| Email | User ID |
|-------|---------|
| admin@adaptiq.no | 0a5af4ea-9050-446f-b097-797843775bbf |
| karl@driftpartner.no | 8a9aea08-4bfa-4196-adfb-2a8d1457f0cd |
| karl@vikenkommunikasjon.no | 86284911-fbd5-48a9-a915-678f6f265309 |
| trymgamermail@gmail.com | 5f11b526-9226-4bfb-b5b8-e2ce156496e5 |
| karl@adaptiq.no | f18418a3-70eb-4b1a-b5c1-9fe074ebc1a0 |
| steen71@gmail.com | 9952bd8d-a45d-44c0-8c0d-0ea9b6204809 |

---

## Option 1: Use Edge Function (Recommended)

### Step 1: Get Super Admin Token

1. Login to your app as super admin (karl@medias.no or gyldenhorn@gmail.com)
2. Open browser DevTools (F12)
3. Go to: **Application** → **Local Storage** → Your domain
4. Find the Supabase auth token (key starts with `sb-`)
5. Copy the access token value

### Step 2: Run Cleanup Script

```bash
# Set your token
export SUPER_ADMIN_TOKEN='your_access_token_here'

# Run the cleanup script
./cleanup-all-orphaned-users.sh
```

---

## Option 2: Delete via Supabase Dashboard

For each orphaned user:

1. Go to: https://supabase.com/dashboard/project/ybpgfkieomtsftbuadba
2. Navigate to: **Authentication** → **Users**
3. Search for the email
4. Click the user → **Delete User**
5. Confirm deletion

Repeat for all 6 users listed above.

---

## Option 3: Delete via SQL (Service Role Key Required)

If you have access to the Supabase Service Role Key, you can use the Supabase Admin API:

```bash
# Set environment variable
export SERVICE_KEY='your_service_role_key_here'
export SUPABASE_URL='https://ybpgfkieomtsftbuadba.supabase.co'

# Delete each user
curl -X DELETE "$SUPABASE_URL/auth/v1/admin/users/0a5af4ea-9050-446f-b097-797843775bbf" \
  -H "Authorization: Bearer $SERVICE_KEY" -H "apikey: $SERVICE_KEY"

curl -X DELETE "$SUPABASE_URL/auth/v1/admin/users/8a9aea08-4bfa-4196-adfb-2a8d1457f0cd" \
  -H "Authorization: Bearer $SERVICE_KEY" -H "apikey: $SERVICE_KEY"

curl -X DELETE "$SUPABASE_URL/auth/v1/admin/users/86284911-fbd5-48a9-a915-678f6f265309" \
  -H "Authorization: Bearer $SERVICE_KEY" -H "apikey: $SERVICE_KEY"

curl -X DELETE "$SUPABASE_URL/auth/v1/admin/users/5f11b526-9226-4bfb-b5b8-e2ce156496e5" \
  -H "Authorization: Bearer $SERVICE_KEY" -H "apikey: $SERVICE_KEY"

curl -X DELETE "$SUPABASE_URL/auth/v1/admin/users/f18418a3-70eb-4b1a-b5c1-9fe074ebc1a0" \
  -H "Authorization: Bearer $SERVICE_KEY" -H "apikey: $SERVICE_KEY"

curl -X DELETE "$SUPABASE_URL/auth/v1/admin/users/9952bd8d-a45d-44c0-8c0d-0ea9b6204809" \
  -H "Authorization: Bearer $SERVICE_KEY" -H "apikey: $SERVICE_KEY"
```

---

## Verification After Cleanup

Run this SQL to confirm no orphaned users remain (except protected ones):

```sql
SELECT find_orphaned_auth_users();
```

Expected result: Empty array `[]`

---

## Protected Accounts Verification

Run this to confirm protected accounts still exist:

```sql
SELECT
  b.email,
  b.company_name,
  b.is_super_admin
FROM businesses b
WHERE b.email IN ('karl@medias.no', 'gyldenhorn@gmail.com')
ORDER BY b.email;
```

Expected: 2 records returned

---

## Summary

### What Was Deleted:
- ✅ 3 tenants with all associated data (customers, programs, campaigns, QR codes, etc.)
- ⏳ 6 orphaned auth users (pending manual cleanup)

### What Remains:
- ✅ karl@medias.no (super admin)
- ✅ gyldenhorn@gmail.com (super admin)

All emails from deleted accounts will be available for reuse after orphaned auth users are cleaned up.
