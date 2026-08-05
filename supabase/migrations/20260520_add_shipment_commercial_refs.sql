-- Live/future-live logistics compatibility.
--
-- Export operations commonly track invoice, letter of credit, and Incoterm
-- references alongside purchase order and booking data. These optional fields
-- support shipment detail/commercial workflows without changing existing rows.
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS export_invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS letter_of_credit_number TEXT,
  ADD COLUMN IF NOT EXISTS incoterm TEXT;
