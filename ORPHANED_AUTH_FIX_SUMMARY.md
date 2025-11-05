# Orphaned Auth User Fix - Complete Solution

## Problem Summary

When manually creating companies as a super admin, the system showed the error:
```
Failed to create company: A user with this email address has already been registered
```

This occurred even after deleting a tenant and all associated data in accordance with GDPR requirements.

## Root Causes Identified

### 1. Orphaned Auth Records After Tenant Deletion
- The `delete-tenant` Edge Function deleted database records BEFORE auth users
- If auth user deletion failed (network issues, API errors, etc.), the auth.users record remained
- This orphaned auth record prevented email reuse for new company creation

### 2. Missing Tenant Record Creation
- The `create-company` function tried to insert a business with a `tenant_id` reference
- However, it never created the corresponding tenant record
- This violated the foreign key constraint `businesses_tenant_id_fkey`

## Solutions Implemented

### 1. Updated delete-tenant Edge Function
**File:** `supabase/functions/delete-tenant/index.ts`

**Changes:**
- Auth users are now deleted BEFORE database records (reversed order)
- Added retry logic with exponential backoff (3 attempts, 1-2 second delays)
- If all auth deletions fail, database deletion is aborted (maintains atomicity)
- Better error handling and detailed logging for audit trails
- Returns warnings if some auth users failed to delete

**Benefits:**
- Prevents orphaned auth records in future deletions
- Ensures atomic operations across auth and database
- Better error reporting for debugging

### 2. Updated create-company Edge Function
**File:** `supabase/functions/create-company/index.ts`

**Changes:**
- Added pre-flight check for existing businesses with same email
- Detects orphaned auth users before attempting creation
- Automatically cleans up orphaned auth records when found
- Creates tenant record BEFORE creating business record
- Proper rollback on failures (deletes tenant if business creation fails)
- Sets `is_tenant_admin: true` for proper access control

**Benefits:**
- Handles existing orphaned records gracefully
- Prevents foreign key constraint violations
- Proper multi-tenant setup for each new company
- Clear error messages for different failure scenarios

### 3. Created Orphaned Auth User Detection Functions
**File:** `supabase/migrations/20251105230000_add_orphaned_auth_user_detection.sql`

**New Database Functions:**

#### `find_orphaned_auth_users()`
Returns all auth users without corresponding business or super_admin records.

**Returns:**
```json
[
  {
    "user_id": "uuid",
    "email": "user@example.com",
    "created_at": "timestamp",
    "last_sign_in_at": "timestamp",
    "email_confirmed_at": "timestamp"
  }
]
```

#### `check_auth_user_orphaned(email)`
Checks if a specific email has an orphaned auth user.

**Returns:**
```json
{
  "is_orphaned": true/false,
  "user_id": "uuid or null",
  "email": "user@example.com",
  "message": "descriptive status message"
}
```

**Benefits:**
- Enables auditing and monitoring of auth system health
- Provides tools for super admins to diagnose issues
- Used by create-company for automatic cleanup

### 4. Created Manual Cleanup Tool
**File:** `supabase/functions/cleanup-orphaned-auth-users/index.ts`

**New Edge Function for Super Admins:**

#### Detect Mode
**Request:**
```json
{
  "mode": "detect"
}
```

**Response:**
```json
{
  "success": true,
  "mode": "detect",
  "orphanedUsers": [...],
  "count": 5,
  "message": "Found 5 orphaned auth user(s)"
}
```

#### Cleanup Mode
**Request:**
```json
{
  "mode": "cleanup",
  "userIds": ["uuid1", "uuid2", ...]
}
```

**Response:**
```json
{
  "success": true,
  "mode": "cleanup",
  "results": {
    "total": 5,
    "deleted": 4,
    "failed": 1,
    "errors": [...]
  },
  "message": "Deleted 4 of 5 orphaned auth user(s)"
}
```

**Benefits:**
- Provides manual override for cleanup operations
- Safe guards prevent deleting active users or super admins
- Detailed results for audit logging
- Can be used for bulk cleanup of existing orphaned records

## Architecture Changes

### Deletion Flow (BEFORE)
```
1. Call delete_tenant_and_data() RPC function
   └─ Delete all database records
2. Try to delete auth users (may fail silently)
3. Return success (even if auth deletion failed)
```

**Problem:** Orphaned auth records if step 2 fails

### Deletion Flow (AFTER)
```
1. Fetch business IDs for tenant
2. Delete auth users with retry logic
   └─ If all fail: ABORT and return error
3. Call delete_tenant_and_data() RPC function
   └─ Delete all database records
4. Return success with warnings (if any)
```

**Benefit:** Auth users deleted first with proper error handling

### Company Creation Flow (BEFORE)
```
1. Create auth user
2. Insert business record (with tenant_id)
   └─ FAILS: foreign key constraint violation
```

**Problem:** No tenant record exists for reference

### Company Creation Flow (AFTER)
```
1. Check for existing business with email
2. Detect and cleanup orphaned auth users
3. Create auth user
4. Create tenant record
5. Create business record (with valid tenant_id)
   └─ On failure: cleanup tenant and auth user
```

**Benefit:** Proper multi-tenant setup with rollback

## Testing the Fix

### Test Scenario 1: Create New Company
1. Navigate to Super Admin > Tenant Management
2. Click "Create New Company"
3. Enter company details with a fresh email
4. Verify successful creation with credentials shown

**Expected Result:** ✅ Company created with tenant and business records

### Test Scenario 2: Reuse Email After Tenant Deletion
1. Create a test company
2. Delete the tenant (with data export)
3. Try to create a new company with the same email
4. Verify automatic cleanup of orphaned auth record
5. Verify successful creation

**Expected Result:** ✅ Orphaned auth record cleaned up, new company created

### Test Scenario 3: Manual Cleanup of Orphaned Records
1. Use `cleanup-orphaned-auth-users` function in detect mode
2. Review list of orphaned users
3. Use cleanup mode to remove specific orphaned records
4. Verify successful deletion

**Expected Result:** ✅ Orphaned records identified and removed

## Migration Notes

### Applying Changes to Production

1. **Deploy Database Migration:**
   ```bash
   # Migration will be auto-applied: 20251105230000_add_orphaned_auth_user_detection.sql
   ```

2. **Deploy Edge Functions:**
   - `delete-tenant` (updated)
   - `create-company` (updated)
   - `cleanup-orphaned-auth-users` (new)

3. **Verify Deployment:**
   - Test tenant deletion flow
   - Test company creation flow
   - Check function logs for errors

### Handling Existing Orphaned Records

If there are existing orphaned auth records in production:

1. **Detect Orphaned Records:**
   ```bash
   # Call cleanup-orphaned-auth-users function in detect mode
   curl -X POST "https://[project].supabase.co/functions/v1/cleanup-orphaned-auth-users" \
     -H "Authorization: Bearer [super-admin-token]" \
     -H "Content-Type: application/json" \
     -d '{"mode": "detect"}'
   ```

2. **Review the List:**
   - Verify these are truly orphaned
   - Check if any are expected to exist

3. **Clean Up Orphaned Records:**
   ```bash
   # Call cleanup-orphaned-auth-users function in cleanup mode
   curl -X POST "https://[project].supabase.co/functions/v1/cleanup-orphaned-auth-users" \
     -H "Authorization: Bearer [super-admin-token]" \
     -H "Content-Type: application/json" \
     -d '{"mode": "cleanup", "userIds": ["uuid1", "uuid2"]}'
   ```

## Security Considerations

1. **Auth User Deletion:**
   - Only super admins can trigger deletion
   - Service role key required for auth operations
   - All deletions are logged for audit

2. **Orphaned Record Detection:**
   - Functions use SECURITY DEFINER
   - Application layer enforces super admin access
   - Read-only operations for safety

3. **Cleanup Operations:**
   - Validates each user before deletion
   - Prevents deletion of active businesses
   - Prevents deletion of super admins
   - Provides detailed error reporting

## Monitoring and Maintenance

### Recommended Monitoring

1. **Track Orphaned Auth Users:**
   - Run detect mode weekly to identify orphaned records
   - Alert if count exceeds threshold (e.g., > 5)

2. **Monitor Deletion Failures:**
   - Check edge function logs for auth deletion errors
   - Investigate if retry logic is frequently triggered

3. **Audit Trail:**
   - Review `tenant_deletions` table for deletion history
   - Cross-reference with auth deletion logs

### Maintenance Tasks

1. **Regular Cleanup:**
   - Schedule monthly cleanup of orphaned records
   - Document reasons for any persistent orphans

2. **Review Logs:**
   - Check for patterns in deletion failures
   - Update retry logic if needed

## Future Improvements

1. **Automatic Cleanup Job:**
   - Create scheduled Edge Function to detect and clean orphaned records
   - Run daily or weekly depending on volume

2. **Better Tenant Deletion UI:**
   - Show auth deletion status in real-time
   - Provide retry button if auth deletion fails
   - Display orphaned record warnings

3. **Admin Dashboard:**
   - Add section showing orphaned auth users count
   - One-click cleanup from UI
   - Historical trend charts

4. **Database Triggers:**
   - Consider adding database trigger to log when businesses are deleted
   - Track corresponding auth user cleanup status

## Conclusion

This solution comprehensively addresses the orphaned auth user issue by:

1. ✅ Preventing new orphaned records (delete auth users first)
2. ✅ Handling existing orphaned records (automatic cleanup)
3. ✅ Fixing foreign key constraint issues (create tenant records)
4. ✅ Providing tools for super admins (manual cleanup function)
5. ✅ Maintaining GDPR compliance (proper deletion order)

The system now properly manages the full lifecycle of tenant deletion and company creation, ensuring email reuse works correctly and database integrity is maintained.
