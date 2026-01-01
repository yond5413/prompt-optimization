"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Play, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreateEvaluationDialog } from "@/components/evaluations/create-evaluation-dialog";
import { fetchEvaluations } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Evaluation {
  id: string;
  prompt_version_id: string;
  dataset_id: string;
  status: string;
  aggregate_scores?: {
    correctness?: number;
    format_adherence?: number;
    clarity?: number;
    verbosity?: number;
    safety?: number;
    consistency?: number;
  };
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export default function EvaluationsPage() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvaluationsData = async () => {
    try {
      setLoading(true);
      const data = await fetchEvaluations();
      setEvaluations(data);
      setError(null);
    } catch (err: any) {
      console.error("Failed to load evaluations:", err);
      setError(err.message || "Failed to load evaluations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvaluationsData();

    const channel = supabase
      .channel("evaluations-list-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "evaluations",
        },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            setEvaluations((prev) => [payload.new as Evaluation, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            const updatedEval = payload.new as Evaluation;

            setEvaluations((prev) => {
              const existing = prev.find(e => e.id === updatedEval.id);

              // If status changed to completed or failed, trigger a full refetch
              if (existing?.status === "running" && (updatedEval.status === "completed" || updatedEval.status === "failed")) {
                setTimeout(() => fetchEvaluationsData(), 100);
              }

              return prev.map((e) => (e.id === updatedEval.id ? updatedEval : e));
            });
          } else if (payload.eventType === "DELETE") {
            setEvaluations((prev) => prev.filter((e) => e.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      running: "secondary",
      pending: "outline",
      failed: "destructive",
    };
    return (
      <Badge variant={variants[status] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Evaluations</h2>
          <p className="text-muted-foreground">
            View evaluation results, compare versions, and track metrics
          </p>
        </div>
        <CreateEvaluationDialog onEvaluationCreated={fetchEvaluationsData}>
          <Button>
            <Play className="mr-2 h-4 w-4" /> New Evaluation Run
          </Button>
        </CreateEvaluationDialog>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading evaluations...</p>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={fetchEvaluationsData}>Retry</Button>
          </CardContent>
        </Card>
      ) : evaluations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
              <BarChart3 className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold">No evaluations yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Run an evaluation on a prompt version using one of your datasets to see performance metrics.
            </p>
            <CreateEvaluationDialog onEvaluationCreated={fetchEvaluationsData}>
              <Button>Run your first evaluation</Button>
            </CreateEvaluationDialog>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Prompt Version ID</TableHead>
                  <TableHead>Dataset ID</TableHead>
                  <TableHead>Correctness</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluations.map((evaluation) => (
                  <TableRow key={evaluation.id}>
                    <TableCell>{getStatusBadge(evaluation.status)}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {evaluation.prompt_version_id.slice(0, 8)}...
                      </code>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {evaluation.dataset_id.slice(0, 8)}...
                      </code>
                    </TableCell>
                    <TableCell>
                      {evaluation.aggregate_scores?.correctness !== undefined
                        ? `${(evaluation.aggregate_scores.correctness * 100).toFixed(1)}%`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {evaluation.aggregate_scores?.format_adherence !== undefined
                        ? `${(evaluation.aggregate_scores.format_adherence * 100).toFixed(1)}%`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {evaluation.started_at
                        ? new Date(evaluation.started_at).toLocaleString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {evaluation.completed_at
                        ? new Date(evaluation.completed_at).toLocaleString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Link href={`/evaluations/${evaluation.id}`}>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

