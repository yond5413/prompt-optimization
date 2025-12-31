from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID


class PromptCreate(BaseModel):
    name: str
    task_type: str
    content: Optional[str] = ""
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
    user_id: Optional[UUID] = None
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
    source: str = "local"  # local, starter, huggingface
    starter_id: Optional[str] = None


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
    variable_mapping: Optional[Dict[str, str]] = None  # Maps prompt variables to dataset columns
    evaluation_strategy: Optional[str] = "exact_match"


class EvaluationScore(BaseModel):
    correctness: float
    format_adherence: float
    clarity: Optional[float] = None
    verbosity: Optional[float] = None
    safety: Optional[float] = None
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
    evaluation_strategy: Optional[str] = "exact_match"
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
    method: str = "meta_prompting"  # meta_prompting, cot, few_shot
    evaluation_strategy: Optional[str] = None
    base_version_id: Optional[UUID] = None


class PromotionRequest(BaseModel):
    prompt_id: UUID
    candidate_id: UUID
    reason: Optional[str] = None


class RollbackRequest(BaseModel):
    prompt_id: UUID
    version_id: UUID
    reason: Optional[str] = "Manual rollback"


class ManualDatasetCreate(BaseModel):
    name: str
    description: Optional[str] = None
    column_schema: Dict[str, Any]  # {"columns": {"col1": {"type": "text"}}, "order": ["col1"]}
    

class DatasetRowCreate(BaseModel):
    rows: List[Any]  # List of row data (either flat or with {input, expected_output})


class DatasetColumnUpdate(BaseModel):
    column_schema: Dict[str, Any]


class DatasetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    evaluation_strategy: Optional[str] = None


class DatasetRowUpdate(BaseModel):
    input: Optional[Any] = None
    expected_output: Optional[Any] = None
    metadata: Optional[Dict[str, Any]] = None

