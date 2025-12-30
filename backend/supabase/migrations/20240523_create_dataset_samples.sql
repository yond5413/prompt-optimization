-- Dataset Samples (actual examples)
CREATE TABLE dataset_samples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
    input JSONB NOT NULL,
    expected_output JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for faster lookups by dataset
CREATE INDEX idx_dataset_samples_dataset_id ON dataset_samples(dataset_id);

