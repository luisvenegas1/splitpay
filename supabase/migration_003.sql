-- ============================================================
-- Migration 003: Add pending_approval payment status
-- ============================================================

-- Add new enum value (can only add, not remove in PostgreSQL)
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'pending_approval';
