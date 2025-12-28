# PRD: Self-Improving Prompt Optimization Platform

## 1. Purpose & Vision

Large Language Model (LLM) prompts are increasingly critical production assets, yet today they are often managed as unversioned text blobs with ad-hoc evaluation. This project aims to build a **self-improving prompt optimization platform** that treats prompts like code: versioned, testable, auditable, and continuously improved.

The system provides **CI/CD for prompts**:
- Prompts are uploaded, versioned, and deployed behind a stable inference API.
- Prompts are continuously evaluated on datasets.
- The system proposes prompt improvements automatically.
- Controlled experiments (A/B-style) determine whether improvements are promoted.
- All changes are transparent, explainable, and reversible.

This PRD is written so that **both humans and AI agents** can understand and implement the system.

---

## 2. Goals & Non-Goals

### 2.1 Goals
- Treat prompts as first-class, versioned artifacts.
- Provide automated, repeatable evaluation of prompt quality.
- Enable safe, interpretable self-improvement of prompts.
- Support multiple evaluation dimensions (correctness, format, safety, etc.).
- Minimize cost via caching and controlled experimentation.
- Be deployable on free or low-cost infrastructure.

### 2.2 Non-Goals
- Training or fine-tuning base LLMs.
- Replacing human oversight entirely.
- Real-time online learning from end users (initially batch-based).

---

## 3. User Personas

### 3.1 ML Engineer / Prompt Engineer
- Uploads prompts for production use.
- Wants confidence that prompt changes improve outcomes.
- Needs transparency, metrics, and rollback.

### 3.2 Researcher / Experimenter
- Tests prompt optimization strategies (evolutionary, meta-prompting, etc.).
- Compares algorithms and evaluation metrics.

### 3.3 AI Agent (Future)
- Automatically proposes prompt improvements.
- Reads metrics, diffs, and promotion rules to decide next actions.

---

## 4. System Overview

High-level workflow:

1. User uploads a prompt.
2. Prompt is stored as a versioned artifact with schema and metadata.
3. Prompt is evaluated on one or more datasets.
4. The system generates candidate prompt variants.
5. Candidates are evaluated and compared against the baseline.
6. If promotion criteria are met, a new prompt version is promoted.
7. All changes are logged, diffed, and explained.

---

## 5. Prompt Management

### 5.1 Prompt Artifact Definition

Each prompt version includes:
- `prompt_id` (stable identifier)
- `version`
- `content` (template text)
- `input_schema` (expected inputs)
- `output_schema` (expected outputs, e.g., JSON)
- `task_type` (classification, generation, reasoning, etc.)
- `metadata` (author, tags, dataset compatibility)
- `parent_version` (lineage tracking)
- `created_at`

### 5.2 Versioning Rules
- Prompts are immutable once created.
- Any change creates a new version.
- Lineage forms a DAG, not just a linear chain.

---

## 6. Datasets & Evaluation Data

### 6.1 Built-in Starter Datasets
- Support Email Routing (3 and 10 assignees)
- Multilingual Math (latent language rules)
- Email Assistant (Simple and Eccentric personas)

### 6.2 External / Benchmark Datasets
- GLUE / SuperGLUE
- SQuAD / Natural Questions
- GSM8K / MATH / AQuA-RAT
- HumanEval / MBPP
- XGLUE / TyDi QA

### 6.3 Dataset Metadata
Each dataset includes:
- Input format
- Expected output format
- Evaluation strategy
- Difficulty level
- Supported task types

---

## 7. Evaluation System

### 7.1 Evaluation Dimensions

Each prompt is scored along multiple dimensions:

- **Correctness**
  - Exact match
  - Numeric match
  - Rubric-based (LLM judge)

- **Format Adherence**
  - JSON schema validation
  - Regex checks
  - Required fields present

- **Clarity & Specificity**
  - LLM-based scoring

- **Verbosity**
  - Token or sentence count
  - Penalties for excess

- **Safety / Hallucination**
  - LLM-based judge
  - Deterministic keyword checks

- **Consistency**
  - Multiple runs, variance detection

### 7.2 Blinded Evaluation
- Judges do not know prompt version identity.
- Separate prompts for generation vs judging.
- Low-temperature / deterministic evaluation where possible.

### 7.3 Metrics Storage
- Per-example scores
- Aggregate metrics
- Confidence intervals (e.g., Wilson score)

---

## 8. Candidate Generation Algorithms

### 8.1 Supported Algorithms

1. **Evolutionary Optimization**
   - Mutation, crossover, selection
   - Fitness = evaluation score

2. **Meta-Prompting / Reflection**
   - LLM critiques prompt and proposes improvements
   - Includes natural-language rationale

3. **Prompt Gradients**
   - Iterative refinement of instructions or examples

4. **Few-Shot Prompting**
   - Add or refine demonstrations

5. **Chain-of-Thought (CoT)**
   - Explicit reasoning steps

6. **ReAct**
   - Reasoning + action format

### 8.2 Candidate Metadata
Each candidate stores:
- Generation method
- Parent prompt version
- Rationale (LLM-generated)
- Timestamp

---

## 9. Self-Improvement Loop

### 9.1 Loop Steps

1. Baseline evaluation
2. Candidate generation (N candidates)
3. Candidate evaluation
4. Comparison against baseline
5. Promotion decision
6. Logging and explanation

### 9.2 Promotion Guardrails
- Minimum aggregate improvement threshold
- No regression on critical metrics
- Minimum format pass-rate
- Optional manual approval

### 9.3 Rollback
- Any version can be rolled back instantly.
- Rollback preserves history.

---

## 10. Transparency & Explainability

- Prompt diffs (text-level)
- Metric deltas (before vs after)
- Per-example improvements/regressions
- LLM-generated explanations:
  - Why a candidate was promoted or rejected

---

## 11. Architecture & Tech Stack

### Frontend
- Next.js
- React
- Charts: Recharts / Chart.js

### Backend
- FastAPI
- Async background tasks

### Storage
- PostgreSQL (Supabase)
- Supabase Storage for datasets
- Supabase-based cache for LLM outputs

### LLM Access
- OpenRouter (free tier)

### Hosting
- Render (frontend + backend)
- Optional Modal for heavy evaluation workloads

---

## 12. Success Metrics

- Improvement in correctness across datasets
- Reduced format violations
- Stable or reduced variance
- Ability to discover latent rules
- Clear, auditable change history

---

## 13. Future Extensions

- Online learning from production traffic
- Multi-prompt pipelines
- Cost-aware optimization objectives
- Integration with CI pipelines (GitHub Actions)

---

## 14. Open Questions

- Best default scoring aggregation strategy?
- How to balance speed vs stability automatically?
- When to require human approval?

---
