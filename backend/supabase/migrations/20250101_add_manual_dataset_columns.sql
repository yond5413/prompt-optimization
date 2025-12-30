-- Add columns to support manual dataset creation
ALTER TABLE datasets 
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'upload',
ADD COLUMN IF NOT EXISTS column_schema JSONB,
ADD COLUMN IF NOT EXISTS user_id UUID;

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_datasets_user_id ON datasets(user_id);
