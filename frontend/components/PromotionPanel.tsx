"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";

interface PromotionPanelProps {
  candidateId: string;
  onPromote: () => void;
  onReject: () => void;
  bestImprovement?: number;
  reason?: string;
}

export default function PromotionPanel({
  candidateId,
  onPromote,
  onReject,
  bestImprovement,
  reason,
}: PromotionPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Promotion Decision</CardTitle>
        <CardDescription>
          Review the candidate and decide whether to promote it to active version.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
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
      </CardContent>
      <CardFooter className="flex gap-4">
        <Button
          onClick={onPromote}
          variant="default"
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Promote
        </Button>
        <Button
          onClick={onReject}
          variant="destructive"
        >
          <XCircle className="mr-2 h-4 w-4" />
          Reject
        </Button>
      </CardFooter>
    </Card>
  );
}
