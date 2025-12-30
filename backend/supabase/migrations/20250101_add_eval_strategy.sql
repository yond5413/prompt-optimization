-- Migration: Add evaluation_strategy to evaluations table
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS evaluation_strategy VARCHAR(50) DEFAULT 'exact_match';

-- Update existing evaluations to have 'exact_match' if null
UPDATE evaluations SET evaluation_strategy = 'exact_match' WHERE evaluation_strategy IS NULL;
