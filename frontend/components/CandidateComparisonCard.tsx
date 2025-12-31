"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUp, ArrowDown, Minus, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { compareCandidate } from "@/lib/api";
import PromptDiff from "./PromptDiff";

interface CandidateComparisonCardProps {
  candidateId: string;
  baselineVersionId: string;
  baselineContent?: string;
  candidateContent?: string;
  candidateRationale?: string;
  candidateScores?: Record<string, number>;
  candidateStatus?: string;
  onPromote?: () => void;
  onReject?: () => void;
}

interface ComparisonData {
  baseline: {
    id: string;
    version: number;
    content: string;
    scores: Record<string, number>;
  };
  candidate: {
    id: string;
    content: string;
    rationale: string;
    scores: Record<string, number>;
    status: string;
  };
  diff: string[];
  metric_deltas: Record<string, number>;
}

function MetricDelta({ metric, delta }: { metric: string; delta: number }) {
  const isPositive = delta > 0;
  const isNeutral = Math.abs(delta) < 0.001;

  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-sm font-medium capitalize">{metric.replace("_", " ")}</span>
      <div className="flex items-center gap-2">
        {isNeutral ? (
          <>
            <Minus className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">No change</span>
          </>
        ) : (
          <>
            {isPositive ? (
              <ArrowUp className="h-4 w-4 text-green-600" />
            ) : (
              <ArrowDown className="h-4 w-4 text-red-600" />
            )}
            <span className={`text-sm font-semibold ${isPositive ? "text-green-600" : "text-red-600"}`}>
              {isPositive ? "+" : ""}{(delta * 100).toFixed(1)}%
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export default function CandidateComparisonCard({
  candidateId,
  baselineVersionId,
  candidateContent,
  candidateRationale,
  candidateScores,
  candidateStatus,
  onPromote,
  onReject,
  baselineContent,
}: CandidateComparisonCardProps) {
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (expanded && !comparison) {
      loadComparison();
    }
  }, [expanded]);

  async function loadComparison() {
    setLoading(true);
    setError("");
    try {
      const data = await compareCandidate(baselineVersionId, candidateId);
      setComparison(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load comparison");
    } finally {
      setLoading(false);
    }
  }

  const scores = candidateScores || comparison?.candidate.scores || {};
  const deltas = comparison?.metric_deltas || {};
  const hasDeltas = Object.keys(deltas).length > 0;

  return (
    <Card className={`w-full ${(candidateStatus === "promoted" || candidateStatus === "accepted") ? "border-green-200 bg-green-50/30 dark:border-green-900/50 dark:bg-green-950/10" : ""}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">Candidate Prompt</CardTitle>
            <CardDescription className="mt-1">
              {candidateRationale || comparison?.candidate.rationale || "No rationale provided"}
            </CardDescription>
          </div>
          <Badge variant={
            candidateStatus === "promoted" || candidateStatus === "accepted"
              ? "default"
              : candidateStatus === "rejected"
                ? "destructive"
                : "secondary"
          }>
            {(candidateStatus === "promoted" || candidateStatus === "accepted") ? "Accepted" : (candidateStatus || "pending")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scores Summary */}
        {Object.keys(scores).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(scores).map(([key, value]) => (
              <Badge key={key} variant="outline">
                {key.replace("_", " ")}: {((value as number) * 100).toFixed(0)}%
              </Badge>
            ))}
          </div>
        )}

        {/* Expand/Collapse Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="mr-2 h-4 w-4" />
              Hide Details
            </>
          ) : (
            <>
              <ChevronDown className="mr-2 h-4 w-4" />
              View Full Comparison
            </>
          )}
        </Button>

        {/* Expanded Details */}
        {expanded && (
          <div className="space-y-4 pt-4 border-t">
            {loading && (
              <div className="text-center py-8 text-muted-foreground">
                Loading comparison...
              </div>
            )}

            {error && (
              <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                {error}
              </div>
            )}

            {comparison && (
              <Tabs defaultValue="metrics" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="metrics">Metrics</TabsTrigger>
                  <TabsTrigger value="diff">Text Diff</TabsTrigger>
                </TabsList>

                <TabsContent value="metrics" className="space-y-4">
                  {hasDeltas ? (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Metric Changes</h4>
                      <div className="border rounded-md p-3">
                        {Object.entries(deltas).map(([metric, delta]) => (
                          <MetricDelta key={metric} metric={metric} delta={delta} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      No baseline metrics available for comparison
                    </div>
                  )}

                  {/* Side-by-side scores */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Baseline</h4>
                      <div className="space-y-1">
                        {Object.entries(comparison.baseline.scores).map(([key, value]) => (
                          <div key={key} className="text-xs flex justify-between">
                            <span className="text-muted-foreground">{key.replace("_", " ")}:</span>
                            <span className="font-medium">{(value * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Candidate</h4>
                      <div className="space-y-1">
                        {Object.entries(comparison.candidate.scores).map(([key, value]) => (
                          <div key={key} className="text-xs flex justify-between">
                            <span className="text-muted-foreground">{key.replace("_", " ")}:</span>
                            <span className="font-medium">{(value * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="diff">
                  <PromptDiff
                    original={baselineContent || comparison?.baseline.content || ""}
                    modified={candidateContent || comparison?.candidate.content || ""}
                  />
                </TabsContent>
              </Tabs>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {(onPromote || onReject) &&
          candidateStatus !== "promoted" &&
          candidateStatus !== "accepted" &&
          candidateStatus !== "rejected" && (
            <div className="flex gap-2 pt-4 border-t">
              {onPromote && (
                <Button
                  onClick={onPromote}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Promote
                </Button>
              )}
              {onReject && (
                <Button
                  onClick={onReject}
                  variant="destructive"
                  className="flex-1"
                >
                  Reject
                </Button>
              )}
            </div>
          )}

        {(candidateStatus === "promoted" || candidateStatus === "accepted") && (
          <div className="pt-4 border-t flex items-center justify-center gap-2 text-green-600 font-medium">
            <CheckCircle2 className="h-5 w-5" />
            <span>This candidate has been accepted and promoted to active.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
