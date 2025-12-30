-- Add evaluation-related fields to candidates table
-- This allows us to store evaluation scores and link candidates to evaluations

-- Add evaluation_scores column to store aggregate scores
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS evaluation_scores JSONB DEFAULT '{}'::jsonb;

-- Add evaluation_id to link candidate to the evaluation that generated it (optional)
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS evaluation_id UUID REFERENCES evaluations(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_candidates_evaluation_id ON candidates(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_prompt_status ON candidates(prompt_id, status);

-- Add comments for documentation
COMMENT ON COLUMN candidates.evaluation_scores IS 'Aggregate evaluation scores for this candidate';
COMMENT ON COLUMN candidates.evaluation_id IS 'Optional link to the evaluation that generated this candidate';

