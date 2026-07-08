-- migration_006: Mark which participant paid the bill
ALTER TABLE participants ADD COLUMN IF NOT EXISTS is_payer boolean DEFAULT false;
