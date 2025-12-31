"use client";

import { useState, useEffect } from "react";
import { Zap, Database, Settings2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { fetchDatasets, runImprovement } from "@/lib/api";

interface Dataset {
  id: string;
  name: string;
  description?: string;
  evaluation_strategy?: string;
}

interface ImprovementResult {
  baseline_scores: Record<string, number>;
  best_candidate: {
    content: string;
    rationale: string;
    scores: Record<string, number>;
  } | null;
  best_improvement: number;
  should_promote: boolean;
  rejection_reason: string;
  candidates_evaluated: number;
}

interface ImprovementDialogProps {
  promptId: string;
  promptName: string;
  baseVersionId?: string;
  onImprovementComplete?: (result: ImprovementResult) => void;
  children?: React.ReactNode;
}

const GENERATION_METHODS = [
  { value: "meta_prompting", label: "Meta-Prompting", description: "LLM critiques and improves the prompt" },
  { value: "cot", label: "Chain-of-Thought", description: "Adds step-by-step reasoning" },
  { value: "few_shot", label: "Few-Shot", description: "Adds demonstration examples" },
];

const EVALUATION_STRATEGIES = [
  { value: "exact_match", label: "Exact Match", description: "Strict string equality" },
  { value: "numeric_match", label: "Numeric Match", description: "Extracts and compares numbers (allows small tolerance)" },
  { value: "llm_judge", label: "LLM Judge (Rubric)", description: "AI evaluates based on rubric" },
  { value: "contains", label: "Contains", description: "Checks if expected output is in actual output" },
];

export default function ImprovementDialog({
  promptId,
  promptName,
  baseVersionId,
  onImprovementComplete,
  children,
}: ImprovementDialogProps) {
  const [open, setOpen] = useState(false);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>("");
  const [numCandidates, setNumCandidates] = useState(3);
  const [generationMethod, setGenerationMethod] = useState("meta_prompting");
  const [evalStrategy, setEvalStrategy] = useState("exact_match");
  const [autoPromote, setAutoPromote] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ImprovementResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadDatasets();
    }
  }, [open]);

  async function loadDatasets() {
    setIsLoading(true);
    try {
      const data = await fetchDatasets();
      setDatasets(data);
      if (data.length > 0 && !selectedDataset) {
        setSelectedDataset(data[0].id);
        if (data[0].evaluation_strategy) {
          setEvalStrategy(data[0].evaluation_strategy);
        }
      }
    } catch (err) {
      console.error("Failed to load datasets:", err);
      setError("Failed to load datasets");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRunImprovement() {
    if (!selectedDataset) {
      setError("Please select a dataset");
      return;
    }

    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const improvementResult = await runImprovement({
        prompt_id: promptId,
        dataset_id: selectedDataset,
        num_candidates: numCandidates,
        auto_promote: autoPromote,
        method: generationMethod,
        evaluation_strategy: evalStrategy,
        base_version_id: baseVersionId,
      });

      setResult(improvementResult);
      onImprovementComplete?.(improvementResult);
    } catch (err) {
      console.error("Improvement failed:", err);
      setError(err instanceof Error ? err.message : "Improvement loop failed");
    } finally {
      setIsRunning(false);
    }
  }

  const selectedDatasetInfo = datasets.find((d) => d.id === selectedDataset);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Zap className="h-4 w-4 mr-2" />
            Improve Prompt
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Self-Improvement Loop
          </DialogTitle>
          <DialogDescription>
            Generate and evaluate improved versions of &quot;{promptName}&quot;
          </DialogDescription>
        </DialogHeader>

        {result ? (
          // Results View
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Candidates Evaluated
                  </div>
                  <div className="text-2xl font-bold">{result.candidates_evaluated}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Best Improvement
                  </div>
                  <div className={`text-2xl font-bold ${result.best_improvement > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {result.best_improvement > 0 ? '+' : ''}{(result.best_improvement * 100).toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {result.baseline_scores && (
              <div>
                <Label className="text-sm font-medium">Baseline Scores</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(result.baseline_scores).map(([key, value]) => (
                    <Badge key={key} variant="outline">
                      {key}: {(value * 100).toFixed(0)}%
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {result.best_candidate && (
              <div>
                <Label className="text-sm font-medium">Best Candidate</Label>
                <Card className="mt-2">
                  <CardContent className="pt-4 space-y-3">
                    <div>
                      <span className="text-xs text-muted-foreground">Rationale:</span>
                      <p className="text-sm">{result.best_candidate.rationale}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(result.best_candidate.scores).map(([key, value]) => (
                        <Badge key={key} variant="secondary">
                          {key}: {(value * 100).toFixed(0)}%
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex items-center gap-2 mt-4">
              {result.should_promote ? (
                <Badge className="bg-green-100 text-green-800">
                  {autoPromote ? "Auto-Promoted" : "Ready to Promote"}
                </Badge>
              ) : (
                <Badge variant="secondary">Not Promoted</Badge>
              )}
              {result.rejection_reason && (
                <span className="text-sm text-muted-foreground">{result.rejection_reason}</span>
              )}
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setResult(null)}>
                Run Again
              </Button>
              <Button onClick={() => setOpen(false)}>Close</Button>
            </DialogFooter>
          </div>
        ) : (
          // Configuration View
          <>
            <div className="grid gap-6 py-4">
              {/* Dataset Selection */}
              <div className="space-y-2">
                <Label htmlFor="dataset" className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Evaluation Dataset
                </Label>
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : datasets.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    No datasets available. Create a dataset first.
                  </div>
                ) : (
                  <Select value={selectedDataset} onValueChange={(val) => {
                    setSelectedDataset(val);
                    const ds = datasets.find(d => d.id === val);
                    if (ds?.evaluation_strategy) {
                      setEvalStrategy(ds.evaluation_strategy);
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a dataset" />
                    </SelectTrigger>
                    <SelectContent>
                      {datasets.map((dataset) => (
                        <SelectItem key={dataset.id} value={dataset.id}>
                          <div className="flex items-center gap-2">
                            <span>{dataset.name}</span>
                            {dataset.evaluation_strategy && (
                              <Badge variant="outline" className="text-xs">
                                {dataset.evaluation_strategy}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedDatasetInfo?.description && (
                  <p className="text-xs text-muted-foreground">{selectedDatasetInfo.description}</p>
                )}
              </div>

              {/* Generation Method */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Generation Method
                </Label>
                <Select value={generationMethod} onValueChange={setGenerationMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GENERATION_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        <div className="flex flex-col">
                          <span>{method.label}</span>
                          <span className="text-xs text-muted-foreground">{method.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Evaluation Strategy */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Correctness Metric
                </Label>
                <Select value={evalStrategy} onValueChange={setEvalStrategy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVALUATION_STRATEGIES.map((strategy) => (
                      <SelectItem key={strategy.value} value={strategy.value}>
                        <div className="flex flex-col">
                          <span>{strategy.label}</span>
                          <span className="text-xs text-muted-foreground">{strategy.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Number of Candidates */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Number of Candidates</Label>
                  <span className="text-sm font-medium">{numCandidates}</span>
                </div>
                <Slider
                  value={[numCandidates]}
                  onValueChange={([value]) => setNumCandidates(value)}
                  min={1}
                  max={5}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  More candidates = more LLM calls = higher cost but better chance of improvement
                </p>
              </div>

              {/* Auto-Promote Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-promote">Auto-Promote Best Candidate</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically promote if improvement threshold is met
                  </p>
                </div>
                <Switch
                  id="auto-promote"
                  checked={autoPromote}
                  onCheckedChange={setAutoPromote}
                />
              </div>

              {error && (
                <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                  {error}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleRunImprovement}
                disabled={isRunning || !selectedDataset || datasets.length === 0}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Start Improvement
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

