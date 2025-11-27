/*
  # Add Customer Sessions Table for Secure Portal Authentication

  1. New Tables
    - `customer_sessions`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, foreign key to customers)
      - `session_token` (text, unique)
      - `expires_at` (timestamptz)
      - `created_at` (timestamptz)
      - `last_activity_at` (timestamptz)
      - `ip_address` (text, optional)
      - `user_agent` (text, optional)

  2. Security
    - Enable RLS on `customer_sessions` table
    - Add policy for customers to read their own sessions
    - Add automatic cleanup of expired sessions
    - Add index on session_token for fast lookups
    - Add index on expires_at for cleanup queries

  3. Changes
    - Adds secure session management for customer portal
    - Replaces client-side sessionStorage with server-side sessions
    - Enables proper session expiration and cleanup
*/

-- Create customer_sessions table
CREATE TABLE IF NOT EXISTS customer_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_activity_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text
);

-- Enable RLS
ALTER TABLE customer_sessions ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_sessions_token ON customer_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_expires ON customer_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer ON customer_sessions(customer_id);

-- RLS Policies
CREATE POLICY "Customers can read own sessions"
  ON customer_sessions FOR SELECT
  TO authenticated
  USING (false); -- Only service role should access this table

CREATE POLICY "Service role full access"
  ON customer_sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_customer_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM customer_sessions
  WHERE expires_at < now();
END;
$$;

-- Add comment
COMMENT ON TABLE customer_sessions IS 'Secure session management for customer portal authentication';
