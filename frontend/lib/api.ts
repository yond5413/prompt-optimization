import { supabase } from "./supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated. Please log in.");
  }

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);
  headers.set("Content-Type", "application/json");

  return fetch(url, {
    ...options,
    headers,
  });
}

export async function fetchPrompts() {
  const response = await authFetch(`${API_BASE_URL}/api/prompts`);
  if (!response.ok) throw new Error("Failed to fetch prompts");
  return response.json();
}

export async function fetchPrompt(id: string) {
  const response = await authFetch(`${API_BASE_URL}/api/prompts/${id}`);
  if (!response.ok) throw new Error("Failed to fetch prompt");
  return response.json();
}

export async function createPrompt(data: {
  name: string;
  task_type: string;
  content?: string;
  input_schema?: any;
  output_schema?: any;
  metadata?: any;
}) {
  const response = await authFetch(`${API_BASE_URL}/api/prompts`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create prompt");
  return response.json();
}

export async function fetchPromptVersions(promptId: string) {
  const response = await authFetch(`${API_BASE_URL}/api/prompts/${promptId}/versions`);
  if (!response.ok) throw new Error("Failed to fetch versions");
  return response.json();
}

export async function fetchPromptVersion(versionId: string) {
  const response = await authFetch(`${API_BASE_URL}/api/prompts/versions/${versionId}`);
  if (!response.ok) throw new Error("Failed to fetch version");
  return response.json();
}

export async function createPromptVersion(
  promptId: string,
  data: {
    content: string;
    parent_version_id?: string;
    generation_method?: string;
    rationale?: string;
  }
) {
  const response = await authFetch(`${API_BASE_URL}/api/prompts/${promptId}/versions`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create version");
  return response.json();
}

export async function activateVersion(promptId: string, versionId: string) {
  const response = await authFetch(
    `${API_BASE_URL}/api/prompts/${promptId}/versions/${versionId}/activate`,
    { method: "POST" }
  );
  if (!response.ok) throw new Error("Failed to activate version");
  return response.json();
}

export async function fetchDatasets() {
  const response = await authFetch(`${API_BASE_URL}/api/datasets`);
  if (!response.ok) throw new Error("Failed to fetch datasets");
  return response.json();
}

export async function fetchDataset(id: string) {
  const response = await authFetch(`${API_BASE_URL}/api/datasets/${id}`);
  if (!response.ok) throw new Error("Failed to fetch dataset");
  return response.json();
}

export async function fetchDatasetSamples(id: string) {
  const response = await authFetch(`${API_BASE_URL}/api/datasets/${id}/samples`);
  if (!response.ok) throw new Error("Failed to fetch dataset samples");
  return response.json();
}

export async function deleteDataset(id: string) {
  const response = await authFetch(`${API_BASE_URL}/api/datasets/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete dataset");
  return response.json();
}

export async function updateDataset(id: string, data: {
  name?: string;
  description?: string;
  evaluation_strategy?: string;
}) {
  const response = await authFetch(`${API_BASE_URL}/api/datasets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update dataset");
  return response.json();
}

export async function deleteDatasetRow(datasetId: string, rowId: string) {
  const response = await authFetch(`${API_BASE_URL}/api/datasets/${datasetId}/rows/${rowId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete row");
  return response.json();
}

export async function updateDatasetRow(datasetId: string, rowId: string, data: {
  input?: any;
  expected_output?: any;
  metadata?: any;
}) {
  const response = await authFetch(`${API_BASE_URL}/api/datasets/${datasetId}/rows/${rowId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update row");
  return response.json();
}

export async function addDatasetRows(datasetId: string, rows: any[]) {
  const response = await authFetch(`${API_BASE_URL}/api/datasets/${datasetId}/rows`, {
    method: "POST",
    body: JSON.stringify({ rows }),
  });
  if (!response.ok) throw new Error("Failed to add rows");
  return response.json();
}

export async function updateDatasetColumns(datasetId: string, columnSchema: any) {
  const response = await authFetch(`${API_BASE_URL}/api/datasets/${datasetId}/columns`, {
    method: "PUT",
    body: JSON.stringify({ column_schema: columnSchema }),
  });
  if (!response.ok) throw new Error("Failed to update columns");
  return response.json();
}

export async function createDataset(data: {
  name: string;
  description?: string;
  input_format?: any;
  output_format?: any;
  evaluation_strategy?: string;
}) {
  const response = await authFetch(`${API_BASE_URL}/api/datasets`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create dataset");
  return response.json();
}

export async function createEvaluation(data: {
  prompt_version_id: string;
  dataset_id: string;
  variable_mapping?: Record<string, string>;
}) {
  const response = await authFetch(`${API_BASE_URL}/api/evaluations`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create evaluation");
  return response.json();
}

export async function fetchEvaluations() {
  const response = await authFetch(`${API_BASE_URL}/api/evaluations`);
  if (!response.ok) throw new Error("Failed to fetch evaluations");
  return response.json();
}

export async function fetchEvaluation(id: string) {
  const response = await authFetch(`${API_BASE_URL}/api/evaluations/${id}`);
  if (!response.ok) throw new Error("Failed to fetch evaluation");
  return response.json();
}

export async function runImprovement(data: {
  prompt_id: string;
  dataset_id: string;
  num_candidates?: number;
  auto_promote?: boolean;
  method?: string;
  evaluation_strategy?: string;
  base_version_id?: string;
}) {
  const response = await authFetch(`${API_BASE_URL}/api/improvements/improve`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to run improvement");
  return response.json();
}

export async function promoteCandidate(data: {
  prompt_id: string;
  candidate_id: string;
  reason?: string;
}) {
  const response = await authFetch(`${API_BASE_URL}/api/improvements/promote`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to promote candidate");
  return response.json();
}

export async function rejectCandidate(candidateId: string) {
  const response = await authFetch(`${API_BASE_URL}/api/improvements/reject/${candidateId}`, {
    method: "POST"
  });
  if (!response.ok) throw new Error("Failed to reject candidate");
  return response.json();
}

export async function rollbackVersion(data: {
  prompt_id: string;
  version_id: string;
  reason?: string;
}) {
  const response = await authFetch(`${API_BASE_URL}/api/improvements/rollback`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to rollback version");
  return response.json();
}

export async function fetchStats() {
  const response = await authFetch(`${API_BASE_URL}/api/stats`);
  if (!response.ok) throw new Error("Failed to fetch stats");
  return response.json();
}

export async function fetchCandidateStats() {
  const response = await authFetch(`${API_BASE_URL}/api/stats/candidates`);
  if (!response.ok) throw new Error("Failed to fetch candidate stats");
  return response.json();
}

export async function fetchPromptPerformance(promptId: string) {
  const response = await authFetch(`${API_BASE_URL}/api/stats/prompt-performance/${promptId}`);
  if (!response.ok) throw new Error("Failed to fetch prompt performance");
  return response.json();
}

export async function fetchCandidates(promptId: string, status?: string) {
  const url = new URL(`${API_BASE_URL}/api/improvements/candidates/${promptId}`);
  if (status) url.searchParams.append("status", status);
  const response = await authFetch(url.toString());
  if (!response.ok) throw new Error("Failed to fetch candidates");
  return response.json();
}

export async function fetchPromotionHistory(promptId: string) {
  const response = await authFetch(`${API_BASE_URL}/api/improvements/promotions/${promptId}`);
  if (!response.ok) throw new Error("Failed to fetch promotion history");
  return response.json();
}

export async function compareCandidate(baselineVersionId: string, candidateId: string) {
  const response = await authFetch(
    `${API_BASE_URL}/api/improvements/compare/${baselineVersionId}/${candidateId}`
  );
  if (!response.ok) throw new Error("Failed to compare candidate");
  return response.json();
}

export async function generateExplanation(data: {
  baseline_scores: Record<string, number>;
  candidate_scores: Record<string, number>;
  candidate_content: string;
  baseline_content: string;
  should_promote: boolean;
  rejection_reason?: string;
}) {
  const response = await authFetch(`${API_BASE_URL}/api/improvements/explain`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to generate explanation");
  return response.json();
}

export async function fetchEvaluationCandidates(evaluationId: string, status?: string) {
  const url = new URL(`${API_BASE_URL}/api/improvements/candidates/evaluation/${evaluationId}`);
  if (status) url.searchParams.append("status", status);
  const response = await authFetch(url.toString());
  if (!response.ok) {
    // If endpoint doesn't exist yet, return empty array
    if (response.status === 404) return [];
    throw new Error("Failed to fetch evaluation candidates");
  }
  return response.json();
}
