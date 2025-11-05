#!/usr/bin/env node

/**
 * One-time script to clean up orphaned auth user for karl@driftpartner.no
 *
 * This user (ID: 8a9aea08-4bfa-4196-adfb-2a8d1457f0cd) exists in auth.users
 * but has no corresponding business, tenant, or super_admin records.
 *
 * Usage:
 *   node cleanup-karl-orphaned-user.js
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: Missing environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const USER_ID = '8a9aea08-4bfa-4196-adfb-2a8d1457f0cd';
const USER_EMAIL = 'karl@driftpartner.no';

async function deleteOrphanedUser() {
  console.log('🔍 Cleaning up orphaned auth user...');
  console.log(`   Email: ${USER_EMAIL}`);
  console.log(`   User ID: ${USER_ID}`);
  console.log('');

  try {
    // Delete the auth user via Admin API
    const response = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users/${USER_ID}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
        },
      }
    );

    if (response.ok) {
      console.log('✅ Successfully deleted orphaned auth user');
      console.log(`   ${USER_EMAIL} has been completely removed from the system`);
      console.log('');
      console.log('The email can now be reused for creating a new company.');
    } else {
      const error = await response.text();
      console.error('❌ Failed to delete auth user');
      console.error(`   Status: ${response.status}`);
      console.error(`   Error: ${error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

deleteOrphanedUser();
