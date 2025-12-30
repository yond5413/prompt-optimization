"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

interface ExplanationPanelProps {
  explanation?: string;
  shouldPromote?: boolean;
  rejectionReason?: string;
  metricDeltas?: Record<string, number>;
  guardrailChecks?: {
    name: string;
    passed: boolean;
    message: string;
  }[];
}

export default function ExplanationPanel({
  explanation,
  shouldPromote,
  rejectionReason,
  metricDeltas,
  guardrailChecks,
}: ExplanationPanelProps) {
  if (!explanation && !rejectionReason && !guardrailChecks) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          Promotion Decision Explanation
        </CardTitle>
        <CardDescription>
          AI-generated analysis of why this candidate was {shouldPromote ? "promoted" : "rejected"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Decision Badge */}
        <div className="flex items-center gap-2">
          {shouldPromote ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Recommended for Promotion
              </Badge>
            </>
          ) : (
            <>
              <XCircle className="h-5 w-5 text-red-600" />
              <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                Not Recommended
              </Badge>
            </>
          )}
        </div>

        {/* Main Explanation */}
        {explanation && (
          <div className="bg-muted p-4 rounded-md">
            <p className="text-sm leading-relaxed">{explanation}</p>
          </div>
        )}

        {/* Rejection Reason */}
        {rejectionReason && !shouldPromote && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-md">
            <p className="text-sm text-red-800 dark:text-red-200">
              <strong>Reason:</strong> {rejectionReason}
            </p>
          </div>
        )}

        {/* Guardrail Checks */}
        {guardrailChecks && guardrailChecks.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Guardrail Checks</h4>
            <div className="space-y-2">
              {guardrailChecks.map((check, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2 p-2 rounded-md border ${
                    check.passed
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                      : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                  }`}
                >
                  {check.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{check.name}</p>
                    <p className="text-xs text-muted-foreground">{check.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metric Deltas Summary */}
        {metricDeltas && Object.keys(metricDeltas).length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Key Metric Changes</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(metricDeltas)
                .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
                .slice(0, 4)
                .map(([metric, delta]) => (
                  <div
                    key={metric}
                    className="flex items-center justify-between p-2 bg-muted rounded-md"
                  >
                    <span className="text-xs capitalize">{metric.replace("_", " ")}</span>
                    <span
                      className={`text-xs font-semibold ${
                        delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : "text-muted-foreground"
                      }`}
                    >
                      {delta > 0 ? "+" : ""}{(delta * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

