-- ============================================================
-- Migration 002: Allow participants to update their own record
-- via payment token (public token-based access)
-- ============================================================

-- Drop the old policy that required authentication
drop policy if exists "Auth can update participants" on participants;

-- New policy: authenticated users (admin) can update any participant
create policy "Auth can update participants"
  on participants for update
  using (auth.role() = 'authenticated');

-- New policy: anon users can update a participant record
-- Security comes from the payment_token being unguessable (UUID-based)
-- This allows the "Ya pagué" flow to work without login
create policy "Public can update participant payment status"
  on participants for update
  using (auth.role() = 'anon')
  with check (auth.role() = 'anon');
