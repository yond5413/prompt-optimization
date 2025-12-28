-- Enable required extension for UUID generation
create extension if not exists "pgcrypto";

-- Prompts (stable identifiers)
create table if not exists prompts (
    id uuid primary key default gen_random_uuid(),
    name varchar(255) not null,
    task_type varchar(50) not null,
    input_schema jsonb,
    output_schema jsonb,
    metadata jsonb,
    created_at timestamptz not null default now()
);

-- Prompt Versions (immutable, DAG lineage)
create table if not exists prompt_versions (
    id uuid primary key default gen_random_uuid(),
    prompt_id uuid not null references prompts(id) on delete cascade,
    version integer not null,
    content text not null,
    parent_version_id uuid references prompt_versions(id) on delete set null,
    generation_method varchar(50),
    rationale text,
    is_active boolean not null default false,
    created_at timestamptz not null default now(),
    unique (prompt_id, version),
    check (version > 0)
);

-- Datasets (evaluation data)
create table if not exists datasets (
    id uuid primary key default gen_random_uuid(),
    name varchar(255) not null,
    description text,
    input_format jsonb,
    output_format jsonb,
    evaluation_strategy varchar(50) default 'exact_match',
    difficulty_level varchar(50),
    supported_task_types text[],
    file_path varchar(500),
    created_at timestamptz not null default now()
);

-- Evaluations (evaluation runs)
create table if not exists evaluations (
    id uuid primary key default gen_random_uuid(),
    prompt_version_id uuid not null references prompt_versions(id) on delete cascade,
    dataset_id uuid not null references datasets(id) on delete cascade,
    status varchar(20) not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
    aggregate_scores jsonb,
    confidence_intervals jsonb,
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz not null default now()
);

-- Evaluation Results (per-example)
create table if not exists evaluation_results (
    id uuid primary key default gen_random_uuid(),
    evaluation_id uuid not null references evaluations(id) on delete cascade,
    example_index integer,
    input jsonb,
    expected_output jsonb,
    actual_output jsonb,
    scores jsonb,
    created_at timestamptz not null default now()
);

-- Candidates (generated prompt variants)
create table if not exists candidates (
    id uuid primary key default gen_random_uuid(),
    prompt_id uuid not null references prompts(id) on delete cascade,
    parent_version_id uuid references prompt_versions(id) on delete set null,
    content text not null,
    generation_method varchar(50),
    rationale text,
    status varchar(20) not null default 'pending' check (status in ('pending', 'evaluating', 'accepted', 'rejected')),
    created_at timestamptz not null default now()
);

-- Promotion History
create table if not exists promotion_history (
    id uuid primary key default gen_random_uuid(),
    prompt_id uuid not null references prompts(id) on delete cascade,
    from_version_id uuid references prompt_versions(id) on delete set null,
    to_version_id uuid references prompt_versions(id) on delete set null,
    reason text,
    metric_deltas jsonb,
    promoted_by varchar(100),
    created_at timestamptz not null default now()
);

-- LLM Cache (Supabase-based cache for LLM outputs)
create table if not exists llm_cache (
    id uuid primary key default gen_random_uuid(),
    model varchar(100) not null,
    prompt_hash text not null,
    input_hash text not null,
    response jsonb not null,
    ttl_seconds integer not null default 86400,
    created_at timestamptz not null default now(),
    last_accessed timestamptz not null default now(),
    expires_at timestamptz not null default (now() + interval '1 day'),
    unique (model, prompt_hash, input_hash)
);

-- Indexes
create index if not exists idx_prompt_versions_prompt_id on prompt_versions(prompt_id);
create index if not exists idx_prompt_versions_active on prompt_versions(prompt_id, is_active);
create index if not exists idx_evaluations_prompt_version on evaluations(prompt_version_id);
create index if not exists idx_evaluations_dataset on evaluations(dataset_id);
create index if not exists idx_evaluation_results_evaluation on evaluation_results(evaluation_id);
create index if not exists idx_candidates_prompt on candidates(prompt_id);
create index if not exists idx_llm_cache_expires_at on llm_cache(expires_at);

