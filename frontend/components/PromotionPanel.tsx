"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CandidateComparisonCard from "./CandidateComparisonCard";
import ExplanationPanel from "./ExplanationPanel";

interface PromotionPanelProps {
  candidateId: string;
  baselineVersionId?: string;
  onPromote: () => void;
  onReject: () => void;
  bestImprovement?: number;
  reason?: string;
  explanation?: string;
  shouldPromote?: boolean;
  rejectionReason?: string;
  metricDeltas?: Record<string, number>;
  candidateContent?: string;
  candidateRationale?: string;
  candidateScores?: Record<string, number>;
}

export default function PromotionPanel({
  candidateId,
  baselineVersionId,
  onPromote,
  onReject,
  bestImprovement,
  reason,
  explanation,
  shouldPromote,
  rejectionReason,
  metricDeltas,
  candidateContent,
  candidateRationale,
  candidateScores,
}: PromotionPanelProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Promotion Decision</CardTitle>
        <CardDescription>
          Review the candidate and decide whether to promote it to active version.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {bestImprovement !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Estimated Improvement:</span>
            <span className={`text-sm font-bold ${bestImprovement > 0 ? "text-green-600" : "text-red-600"}`}>
              {(bestImprovement * 100).toFixed(2)}%
            </span>
          </div>
        )}
        {reason && (
          <div className="text-sm text-muted-foreground italic">
            &quot;{reason}&quot;
          </div>
        )}

        {/* Explanation Preview */}
        {explanation && (
          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm">{explanation}</p>
          </div>
        )}

        {/* View Full Comparison Button */}
        {baselineVersionId && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                View Full Comparison & Analysis
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Detailed Candidate Analysis</DialogTitle>
                <DialogDescription>
                  Complete comparison with metrics, diffs, and AI explanation
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {/* Explanation Panel */}
                {(explanation || rejectionReason) && (
                  <ExplanationPanel
                    explanation={explanation}
                    shouldPromote={shouldPromote}
                    rejectionReason={rejectionReason}
                    metricDeltas={metricDeltas}
                  />
                )}

                {/* Full Comparison */}
                <CandidateComparisonCard
                  candidateId={candidateId}
                  baselineVersionId={baselineVersionId}
                  candidateContent={candidateContent}
                  candidateRationale={candidateRationale}
                  candidateScores={candidateScores}
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
      <CardFooter className="flex gap-4">
        <Button
          onClick={onPromote}
          variant="default"
          className="bg-green-600 hover:bg-green-700 flex-1"
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Promote
        </Button>
        <Button
          onClick={onReject}
          variant="destructive"
          className="flex-1"
        >
          <XCircle className="mr-2 h-4 w-4" />
          Reject
        </Button>
      </CardFooter>
    </Card>
  );
}
