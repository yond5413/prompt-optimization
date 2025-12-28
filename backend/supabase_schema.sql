-- Prompts (stable identifiers)
CREATE TABLE prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    task_type VARCHAR(50) NOT NULL,
    input_schema JSONB,
    output_schema JSONB,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Prompt Versions (immutable)
CREATE TABLE prompt_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID REFERENCES prompts(id),
    version INTEGER NOT NULL,
    content TEXT NOT NULL,
    parent_version_id UUID REFERENCES prompt_versions(id),
    generation_method VARCHAR(50),
    rationale TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Datasets
CREATE TABLE datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    input_format JSONB,
    output_format JSONB,
    evaluation_strategy VARCHAR(50),
    file_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Evaluations (evaluation runs)
CREATE TABLE evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_version_id UUID REFERENCES prompt_versions(id),
    dataset_id UUID REFERENCES datasets(id),
    status VARCHAR(20) DEFAULT 'pending',
    aggregate_scores JSONB,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- Evaluation Results (per-example)
CREATE TABLE evaluation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id UUID REFERENCES evaluations(id),
    example_index INTEGER,
    input JSONB,
    expected_output JSONB,
    actual_output JSONB,
    scores JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Candidates (generated prompt variants)
CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID REFERENCES prompts(id),
    parent_version_id UUID REFERENCES prompt_versions(id),
    content TEXT NOT NULL,
    generation_method VARCHAR(50),
    rationale TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Promotion History
CREATE TABLE promotion_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID REFERENCES prompts(id),
    from_version_id UUID REFERENCES prompt_versions(id),
    to_version_id UUID REFERENCES prompt_versions(id),
    reason TEXT,
    metric_deltas JSONB,
    promoted_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_prompt_versions_prompt_id ON prompt_versions(prompt_id);
CREATE INDEX idx_prompt_versions_active ON prompt_versions(prompt_id, is_active);
CREATE INDEX idx_evaluations_prompt_version ON evaluations(prompt_version_id);
CREATE INDEX idx_evaluations_dataset ON evaluations(dataset_id);
CREATE INDEX idx_evaluation_results_evaluation ON evaluation_results(evaluation_id);
CREATE INDEX idx_candidates_prompt ON candidates(prompt_id);


