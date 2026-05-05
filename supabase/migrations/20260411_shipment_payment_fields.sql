-- Migration: Add payment tracking fields to shipments
-- Phase 1 of Payment Workflow Redesign
--
-- payment_status: lifecycle of inbound buyer payment
-- payment_method: chosen collection mechanism
-- payment_instruction_token: opaque token for buyer-facing payment page (public URL)

ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'none'
    CHECK (payment_status IN ('none', 'pending_setup', 'awaiting_payment', 'partially_funded', 'funded', 'released')),
  ADD COLUMN IF NOT EXISTS payment_method TEXT
    CHECK (payment_method IN ('escrow_usdc', 'swift_virtual', 'manual')),
  ADD COLUMN IF NOT EXISTS payment_instruction_token UUID UNIQUE DEFAULT gen_random_uuid();

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_shipments_payment_status ON shipments (payment_status);
CREATE INDEX IF NOT EXISTS idx_shipments_payment_token  ON shipments (payment_instruction_token);
