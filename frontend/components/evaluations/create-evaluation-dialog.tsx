"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchPrompts, fetchPromptVersions, fetchDatasets, createEvaluation } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Loader2, FileText, Database, Zap, Hash, Search, Scale, ChevronRight } from "lucide-react";
import { VariableMappingDialog } from "./variable-mapping-dialog";
import { extractVariables } from "@/components/prompts/variable-detector";

interface CreateEvaluationDialogProps {
  children: React.ReactNode;
  onEvaluationCreated: () => void;
}

interface Prompt {
  id: string;
  name: string;
  task_type: string;
}

interface PromptVersion {
  id: string;
  version: number;
  is_active: boolean;
  content: string;
}

interface Dataset {
  id: string;
  name: string;
  description?: string;
  evaluation_strategy?: string;
  column_schema?: {
    columns: Record<string, any>;
    order: string[];
  };
}

export function CreateEvaluationDialog({ children, onEvaluationCreated }: CreateEvaluationDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>("");
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [variableMapping, setVariableMapping] = useState<Record<string, string>>({});
  const [datasetSamples, setDatasetSamples] = useState<any[]>([]);
  const [evaluationStrategy, setEvaluationStrategy] = useState<string>("exact_match");

  const EVAL_STRATEGIES = [
    { value: "exact_match", label: "Exact Match" },
    { value: "numeric_match", label: "Numeric Match" },
    { value: "llm_judge", label: "LLM Judge" },
    { value: "contains", label: "Contains" }
  ];

  // Update strategy when dataset changes
  useEffect(() => {
    if (selectedDatasetId) {
      const dataset = datasets.find(d => d.id === selectedDatasetId);
      if (dataset?.evaluation_strategy) {
        setEvaluationStrategy(dataset.evaluation_strategy);
      }
    }
  }, [selectedDatasetId, datasets]);

  // Fetch prompts and datasets when dialog opens
  useEffect(() => {
    if (open) {
      Promise.all([
        fetchPrompts().catch(() => []),
        fetchDatasets().catch(() => [])
      ]).then(([promptsData, datasetsData]) => {
        setPrompts(promptsData);
        setDatasets(datasetsData);
      });
    }
  }, [open]);

  // Fetch versions when prompt is selected
  useEffect(() => {
    if (selectedPromptId) {
      fetchPromptVersions(selectedPromptId)
        .then(setVersions)
        .catch(() => setVersions([]));
    } else {
      setVersions([]);
      setSelectedVersionId("");
    }
  }, [selectedPromptId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedVersionId || !selectedDatasetId) {
      setError("Please select both a prompt version and a dataset");
      return;
    }

    // Check if we need variable mapping
    const selectedVersion = versions.find(v => v.id === selectedVersionId);
    const selectedDataset = datasets.find(d => d.id === selectedDatasetId);

    if (selectedVersion && selectedDataset) {
      const promptVariables = extractVariables(selectedVersion.content);
      const datasetColumns = selectedDataset.column_schema?.order || [];

      // If prompt has variables and dataset has custom columns, show mapping dialog
      if (promptVariables.length > 0 && datasetColumns.length > 0) {
        // Fetch dataset samples for preview
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
          const response = await fetch(`${apiUrl}/api/datasets/${selectedDatasetId}/samples?limit=1`);
          if (response.ok) {
            const samples = await response.json();
            setDatasetSamples(samples);
          }
        } catch (err) {
          console.error("Failed to fetch dataset samples:", err);
        }

        setShowMappingDialog(true);
        return;
      }
    }

    // No mapping needed, proceed directly
    await submitEvaluation({});
  };

  const submitEvaluation = async (mapping: Record<string, string>) => {
    setLoading(true);
    setError("");

    try {
      await createEvaluation({
        prompt_version_id: selectedVersionId,
        dataset_id: selectedDatasetId,
        variable_mapping: Object.keys(mapping).length > 0 ? mapping : undefined,
        evaluation_strategy: evaluationStrategy
      } as any);

      setOpen(false);
      setSelectedPromptId("");
      setSelectedVersionId("");
      setSelectedDatasetId("");
      setVariableMapping({});
      onEvaluationCreated();
    } catch (err: any) {
      setError(err.message || "Failed to create evaluation");
    } finally {
      setLoading(false);
    }
  };

  const selectedVersion = versions.find(v => v.id === selectedVersionId);
  const selectedDataset = datasets.find(d => d.id === selectedDatasetId);
  const promptVariables = selectedVersion ? extractVariables(selectedVersion.content) : [];
  const datasetColumns = selectedDataset?.column_schema?.order || [];

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Start New Evaluation</DialogTitle>
            <DialogDescription>
              Select a prompt version and dataset to evaluate performance.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Prompt</label>
              <Select
                value={selectedPromptId}
                onValueChange={setSelectedPromptId}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a prompt" />
                </SelectTrigger>
                <SelectContent>
                  {prompts.map((prompt) => (
                    <SelectItem key={prompt.id} value={prompt.id}>
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-blue-500" />
                        <span className="font-medium">{prompt.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground ml-6">
                        {prompt.task_type}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPromptId && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Version</label>
                <Select
                  value={selectedVersionId}
                  onValueChange={setSelectedVersionId}
                  disabled={loading || !selectedPromptId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a version" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((version) => (
                      <SelectItem key={version.id} value={version.id}>
                        <div className="flex items-center gap-2">
                          <Scale className="size-4 text-orange-500" />
                          <span className="font-medium">Version {version.version}</span>
                          {version.is_active && (
                            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold uppercase">
                              Active
                            </span>
                          )}
                        </div>
                        {version.content && (
                          <span className="text-xs text-muted-foreground ml-6 line-clamp-1 italic">
                            {version.content.substring(0, 40)}...
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Dataset</label>
              <Select
                value={selectedDatasetId}
                onValueChange={setSelectedDatasetId}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a dataset" />
                </SelectTrigger>
                <SelectContent>
                  {datasets.map((dataset) => (
                    <SelectItem key={dataset.id} value={dataset.id}>
                      <div className="flex items-center gap-2">
                        <Database className="size-4 text-purple-500" />
                        <span className="font-medium">{dataset.name}</span>
                      </div>
                      {dataset.description && (
                        <span className="text-xs text-muted-foreground ml-6 line-clamp-1">
                          {dataset.description}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Evaluation Strategy</label>
              <Select
                value={evaluationStrategy}
                onValueChange={setEvaluationStrategy}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select strategy" />
                </SelectTrigger>
                <SelectContent>
                  {EVAL_STRATEGIES.map((strategy) => {
                    const Icon =
                      strategy.value === "llm_judge" ? Zap :
                        strategy.value === "numeric_match" ? Hash :
                          strategy.value === "contains" ? Search : FileText;

                    const iconColor =
                      strategy.value === "llm_judge" ? "text-yellow-500" :
                        strategy.value === "numeric_match" ? "text-indigo-500" :
                          strategy.value === "contains" ? "text-pink-500" : "text-slate-500";

                    return (
                      <SelectItem key={strategy.value} value={strategy.value}>
                        <div className="flex items-center gap-2">
                          <Icon className={cn("size-4", iconColor)} />
                          <span className="font-medium">{strategy.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Override the dataset&apos;s default scoring strategy.
              </p>
            </div>

            {error && (
              <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !selectedVersionId || !selectedDatasetId}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Start Evaluation
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <VariableMappingDialog
        open={showMappingDialog}
        onOpenChange={setShowMappingDialog}
        promptVariables={promptVariables}
        datasetColumns={datasetColumns}
        sampleRow={datasetSamples.length > 0 ? datasetSamples[0].input : undefined}
        onConfirm={(mapping) => {
          setVariableMapping(mapping);
          setShowMappingDialog(false);
          submitEvaluation(mapping);
        }}
      />
    </>
  );
}

