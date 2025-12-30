"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { fetchEvaluation } from "@/lib/api";
import EvaluationChart from "@/components/EvaluationChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function getScoreColor(score: number): string {
  if (score >= 0.8) return "text-green-600 dark:text-green-400";
  if (score >= 0.5) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Completed</Badge>;
    case "running":
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Running</Badge>;
    case "failed":
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Failed</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

interface ConfidenceInterval {
  lower: number;
  upper: number;
  successes: number;
  total: number;
}

export default function EvaluationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchEvaluation(id)
      .then(setEvaluation)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-[300px] animate-pulse rounded-md bg-muted" />
          <div className="h-[300px] animate-pulse rounded-md bg-muted" />
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex-1 p-8 pt-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <h2 className="text-2xl font-bold">Error Loading Evaluation</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button asChild variant="outline">
            <Link href="/evaluations">Return to Evaluations</Link>
          </Button>
        </div>
      </div>
    );
  }
  
  if (!evaluation) {
    return (
      <div className="flex-1 p-8 pt-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <h2 className="text-2xl font-bold">Evaluation Not Found</h2>
          <Button asChild variant="outline">
            <Link href="/evaluations">Return to Evaluations</Link>
          </Button>
        </div>
      </div>
    );
  }

  const hasError = evaluation.error_message || evaluation.aggregate_scores?.error;
  const errorMessage = evaluation.error_message || evaluation.aggregate_scores?.error;
  const confidenceIntervals: Record<string, ConfidenceInterval> = evaluation.confidence_intervals || {};

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/evaluations">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Evaluation Details</h1>
            <p className="text-sm text-muted-foreground mt-1">
              ID: <span className="font-mono">{evaluation.id}</span>
            </p>
          </div>
        </div>
        {getStatusBadge(evaluation.status)}
      </div>

      {/* Error Banner */}
      {hasError && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
          <CardContent className="flex items-center gap-3 pt-6">
            <XCircle className="h-5 w-5 text-red-600" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">Evaluation Error</p>
              <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Samples Processed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{evaluation.samples_processed ?? evaluation.results?.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Samples Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{evaluation.samples_failed ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Started</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">{evaluation.started_at ? new Date(evaluation.started_at).toLocaleString() : "-"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {evaluation.started_at && evaluation.completed_at
                ? `${((new Date(evaluation.completed_at).getTime() - new Date(evaluation.started_at).getTime()) / 1000).toFixed(1)}s`
                : "-"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aggregate Scores Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Aggregate Scores</CardTitle>
            <CardDescription>Overall performance across all evaluation dimensions</CardDescription>
          </CardHeader>
          <CardContent>
            {evaluation.aggregate_scores && !evaluation.aggregate_scores.error ? (
              <EvaluationChart scores={evaluation.aggregate_scores} />
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No scores available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Confidence Intervals */}
        <Card>
          <CardHeader>
            <CardTitle>Confidence Intervals</CardTitle>
            <CardDescription>95% Wilson score intervals for each metric</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(confidenceIntervals).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(confidenceIntervals).map(([metric, ci]) => (
                  <div key={metric} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize font-medium">{metric.replace("_", " ")}</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="text-muted-foreground">
                              {(ci.lower * 100).toFixed(0)}% - {(ci.upper * 100).toFixed(0)}%
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{ci.successes} / {ci.total} successes</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="absolute h-full bg-primary/30"
                        style={{
                          left: `${ci.lower * 100}%`,
                          width: `${(ci.upper - ci.lower) * 100}%`,
                        }}
                      />
                      <div
                        className="absolute h-full w-1 bg-primary"
                        style={{
                          left: `${((ci.lower + ci.upper) / 2) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No confidence intervals available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Per-Example Results ({evaluation.results?.length || 0})</CardTitle>
          <CardDescription>Detailed scores and outputs for each sample</CardDescription>
        </CardHeader>
        <CardContent>
          {evaluation.results?.length > 0 ? (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">#</TableHead>
                    <TableHead className="w-[100px]">Correct</TableHead>
                    <TableHead className="w-[100px]">Format</TableHead>
                    <TableHead className="w-[100px]">Clarity</TableHead>
                    <TableHead className="w-[100px]">Safety</TableHead>
                    <TableHead>Input / Expected / Output</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evaluation.results.map((res: any) => {
                    const hasResultError = res.scores?.error;
                    return (
                      <TableRow key={res.id} className={hasResultError ? "bg-red-50 dark:bg-red-950/20" : ""}>
                        <TableCell className="font-mono text-sm">{res.example_index}</TableCell>
                        <TableCell>
                          <span className={getScoreColor(res.scores?.correctness ?? 0)}>
                            {((res.scores?.correctness ?? 0) * 100).toFixed(0)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={getScoreColor(res.scores?.format_adherence ?? 0)}>
                            {((res.scores?.format_adherence ?? 0) * 100).toFixed(0)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={getScoreColor(res.scores?.clarity ?? 0)}>
                            {((res.scores?.clarity ?? 0) * 100).toFixed(0)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={getScoreColor(res.scores?.safety ?? 1)}>
                            {((res.scores?.safety ?? 1) * 100).toFixed(0)}%
                          </span>
                        </TableCell>
                        <TableCell className="max-w-lg">
                          <div className="space-y-3 text-xs">
                            {hasResultError && (
                              <div className="flex items-center gap-2 text-red-600 bg-red-100 dark:bg-red-900/30 p-2 rounded">
                                <AlertCircle className="h-3 w-3" />
                                <span>{res.scores.error}</span>
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-muted-foreground mb-1">Input:</p>
                              <pre className="bg-muted p-2 rounded overflow-x-auto max-h-24">
                                {typeof res.input === "string" ? res.input : JSON.stringify(res.input, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <p className="font-semibold text-muted-foreground mb-1">Expected:</p>
                              <pre className="bg-muted p-2 rounded overflow-x-auto max-h-24">
                                {typeof res.expected_output === "string" ? res.expected_output : JSON.stringify(res.expected_output, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <p className="font-semibold text-muted-foreground mb-1">Actual Output:</p>
                              <pre className="bg-muted p-2 rounded overflow-x-auto max-h-24">
                                {res.actual_output === null 
                                  ? "(no output)" 
                                  : typeof res.actual_output === "string" 
                                    ? res.actual_output 
                                    : JSON.stringify(res.actual_output, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
              <p className="text-muted-foreground">No per-example results available</p>
              <p className="text-sm text-muted-foreground mt-2">
                Results may still be processing or the evaluation may have failed
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
