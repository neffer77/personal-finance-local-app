-- Migration: Add manual override and manual entry support to subscriptions
-- Enables users to:
--   1. Manually override auto-detected monthly amounts
--   2. Manually create subscription entries
--   3. Reset overrides back to auto-detected values

-- Add manual override amount (NULL means use auto-detected amount)
ALTER TABLE subscriptions ADD COLUMN manual_override_amount_cents INTEGER NULL;

-- Flag to distinguish manual entries from auto-detected subscriptions
ALTER TABLE subscriptions ADD COLUMN is_manual INTEGER NOT NULL DEFAULT 0;

-- Index for filtering manual vs auto-detected
CREATE INDEX IF NOT EXISTS idx_subscriptions_is_manual ON subscriptions(is_manual);
