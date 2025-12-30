     1|-- Prompts (stable identifiers)
     2|CREATE TABLE prompts (
     3|    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     4|    name VARCHAR(255) NOT NULL,
     5|    task_type VARCHAR(50) NOT NULL,
     6|    input_schema JSONB,
     7|    output_schema JSONB,
     8|    metadata JSONB,
     9|    created_at TIMESTAMP DEFAULT NOW()
    10|);
    11|
    12|-- Prompt Versions (immutable)
    13|CREATE TABLE prompt_versions (
    14|    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    15|    prompt_id UUID REFERENCES prompts(id),
    16|    version INTEGER NOT NULL,
    17|    content TEXT NOT NULL,
    18|    parent_version_id UUID REFERENCES prompt_versions(id),
    19|    generation_method VARCHAR(50),
    20|    rationale TEXT,
    21|    is_active BOOLEAN DEFAULT FALSE,
    22|    created_at TIMESTAMP DEFAULT NOW()
    23|);
    24|
    25|-- Datasets
    26|CREATE TABLE datasets (
    27|    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    28|    name VARCHAR(255) NOT NULL,
    29|    description TEXT,
    30|    input_format JSONB,
    31|    output_format JSONB,
    32|    evaluation_strategy VARCHAR(50),
    33|    file_path VARCHAR(500),
    34|    created_at TIMESTAMP DEFAULT NOW()
    35|);
    36|
    37|-- Dataset Samples (actual examples)
    38|CREATE TABLE dataset_samples (
    39|    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    40|    dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
    41|    input JSONB NOT NULL,
    42|    expected_output JSONB,
    43|    metadata JSONB DEFAULT '{}'::jsonb,
    44|    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    45|);
    46|
    47|-- Evaluations (evaluation runs)
    48|CREATE TABLE evaluations (
    49|    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    50|    prompt_version_id UUID REFERENCES prompt_versions(id),
    51|    dataset_id UUID REFERENCES datasets(id),
    52|    status VARCHAR(20) DEFAULT 'pending',
    53|    aggregate_scores JSONB,
    54|    started_at TIMESTAMP,
    55|    completed_at TIMESTAMP
    56|);
    57|
    58|-- Evaluation Results (per-example)
    59|CREATE TABLE evaluation_results (
    60|    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    61|    evaluation_id UUID REFERENCES evaluations(id),
    62|    example_index INTEGER,
    63|    input JSONB,
    64|    expected_output JSONB,
    65|    actual_output JSONB,
    66|    scores JSONB,
    67|    created_at TIMESTAMP DEFAULT NOW()
    68|);
    69|
    70|-- Candidates (generated prompt variants)
    71|CREATE TABLE candidates (
    72|    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    73|    prompt_id UUID REFERENCES prompts(id),
    74|    parent_version_id UUID REFERENCES prompt_versions(id),
    75|    content TEXT NOT NULL,
    76|    generation_method VARCHAR(50),
    77|    rationale TEXT,
    78|    status VARCHAR(20) DEFAULT 'pending',
    79|    created_at TIMESTAMP DEFAULT NOW()
    80|);
    81|
    82|-- Promotion History
    83|CREATE TABLE promotion_history (
    84|    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    85|    prompt_id UUID REFERENCES prompts(id),
    86|    from_version_id UUID REFERENCES prompt_versions(id),
    87|    to_version_id UUID REFERENCES prompt_versions(id),
    88|    reason TEXT,
    89|    metric_deltas JSONB,
    90|    promoted_by VARCHAR(50),
    91|    created_at TIMESTAMP DEFAULT NOW()
    92|);
    93|
    94|-- Create indexes for better query performance
    95|CREATE INDEX idx_prompt_versions_prompt_id ON prompt_versions(prompt_id);
    96|CREATE INDEX idx_prompt_versions_active ON prompt_versions(prompt_id, is_active);
    97|CREATE INDEX idx_evaluations_prompt_version ON evaluations(prompt_version_id);
    98|CREATE INDEX idx_evaluations_dataset ON evaluations(dataset_id);
    99|CREATE INDEX idx_evaluation_results_evaluation ON evaluation_results(evaluation_id);
   100|CREATE INDEX idx_candidates_prompt ON candidates(prompt_id);
   101|CREATE INDEX idx_dataset_samples_dataset_id ON dataset_samples(dataset_id);
   102|
