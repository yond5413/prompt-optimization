from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID


class PromptCreate(BaseModel):
    name: str
    task_type: str
    input_schema: Optional[Dict[str, Any]] = None
    output_schema: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class PromptVersionCreate(BaseModel):
    content: str
    parent_version_id: Optional[UUID] = None
    generation_method: Optional[str] = None
    rationale: Optional[str] = None


class PromptVersion(BaseModel):
    id: UUID
    prompt_id: UUID
    version: int
    content: str
    parent_version_id: Optional[UUID]
    generation_method: Optional[str]
    rationale: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Prompt(BaseModel):
    id: UUID
    name: str
    task_type: str
    input_schema: Optional[Dict[str, Any]]
    output_schema: Optional[Dict[str, Any]]
    metadata: Optional[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True


class DatasetCreate(BaseModel):
    name: str
    description: Optional[str] = None
    input_format: Optional[Dict[str, Any]] = None
    output_format: Optional[Dict[str, Any]] = None
    evaluation_strategy: str = "exact_match"
    file_path: Optional[str] = None


class Dataset(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    input_format: Optional[Dict[str, Any]]
    output_format: Optional[Dict[str, Any]]
    evaluation_strategy: str
    file_path: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class EvaluationRequest(BaseModel):
    prompt_version_id: UUID
    dataset_id: UUID


class EvaluationCreate(BaseModel):
    prompt_version_id: UUID
    dataset_id: UUID


class EvaluationScore(BaseModel):
    correctness: float
    format_adherence: float
    clarity: Optional[float] = None
    verbosity: Optional[float] = None
    consistency: Optional[float] = None


class EvaluationResult(BaseModel):
    id: UUID
    evaluation_id: UUID
    example_index: int
    input: Dict[str, Any]
    expected_output: Dict[str, Any]
    actual_output: Dict[str, Any]
    scores: Dict[str, float]
    created_at: datetime

    class Config:
        from_attributes = True


class Evaluation(BaseModel):
    id: UUID
    prompt_version_id: UUID
    dataset_id: UUID
    status: str
    aggregate_scores: Optional[Dict[str, float]]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class CandidateGenerateRequest(BaseModel):
    prompt_id: UUID
    parent_version_id: UUID
    method: str = "meta_prompting"  # meta_prompting, few_shot
    num_candidates: int = 3


class Candidate(BaseModel):
    id: UUID
    prompt_id: UUID
    parent_version_id: UUID
    content: str
    generation_method: str
    rationale: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class ImprovementRequest(BaseModel):
    prompt_id: UUID
    dataset_id: UUID
    num_candidates: int = 3
    auto_promote: bool = False


class PromotionRequest(BaseModel):
    prompt_id: UUID
    candidate_id: UUID
    reason: Optional[str] = None

