-- Add variable mapping and column schema support

-- Add variables column to prompts table to store detected variables
ALTER TABLE prompts
ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '[]'::jsonb;

-- Add column_schema to datasets table to store custom column definitions
ALTER TABLE datasets
ADD COLUMN IF NOT EXISTS column_schema JSONB DEFAULT NULL;

-- Add source column to datasets if it doesn't exist
ALTER TABLE datasets
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'local';

-- Add variable_mapping to evaluations table to store prompt variable to dataset column mapping
ALTER TABLE evaluations
ADD COLUMN IF NOT EXISTS variable_mapping JSONB DEFAULT NULL;

-- Add user_id to datasets for multi-tenancy
ALTER TABLE datasets
ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT NULL;

-- Add user_id to prompts for multi-tenancy
ALTER TABLE prompts
ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_prompts_user_id ON prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_datasets_user_id ON datasets(user_id);
CREATE INDEX IF NOT EXISTS idx_datasets_source ON datasets(source);

-- Add comment for documentation
COMMENT ON COLUMN prompts.variables IS 'Array of variable names detected in prompt content, e.g., ["leasor", "input"]';
COMMENT ON COLUMN datasets.column_schema IS 'JSON schema describing custom columns: {"columns": {"col1": {"type": "text", "required": true}}, "order": ["col1"]}';
COMMENT ON COLUMN evaluations.variable_mapping IS 'Mapping from prompt variables to dataset columns, e.g., {"input": "email_body", "leasor": "leasor"}';

