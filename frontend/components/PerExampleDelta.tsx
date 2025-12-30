"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ExampleDelta {
  index: number;
  input: any;
  expected_output: any;
  baseline_score: number;
  candidate_score: number;
  delta: number;
  improved: boolean;
}

interface PerExampleDeltaProps {
  examples: ExampleDelta[];
  maxHeight?: string;
}

export default function PerExampleDelta({ examples, maxHeight = "400px" }: PerExampleDeltaProps) {
  if (!examples || examples.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Per-Example Analysis</CardTitle>
          <CardDescription>No example-level data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const improvedCount = examples.filter((ex) => ex.delta > 0.01).length;
  const regressedCount = examples.filter((ex) => ex.delta < -0.01).length;
  const unchangedCount = examples.length - improvedCount - regressedCount;

  // Sort by absolute delta (biggest changes first)
  const sortedExamples = [...examples].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Per-Example Analysis</CardTitle>
        <CardDescription>
          How the candidate performed on individual samples compared to baseline
        </CardDescription>
        <div className="flex gap-2 mt-2">
          <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20">
            <TrendingUp className="h-3 w-3 mr-1" />
            {improvedCount} improved
          </Badge>
          <Badge variant="outline" className="bg-red-50 dark:bg-red-900/20">
            <TrendingDown className="h-3 w-3 mr-1" />
            {regressedCount} regressed
          </Badge>
          <Badge variant="outline">
            <Minus className="h-3 w-3 mr-1" />
            {unchangedCount} unchanged
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea style={{ height: maxHeight }}>
          <div className="space-y-3">
            {sortedExamples.map((example) => {
              const isImproved = example.delta > 0.01;
              const isRegressed = example.delta < -0.01;
              const isUnchanged = !isImproved && !isRegressed;

              return (
                <div
                  key={example.index}
                  className={`p-3 rounded-md border ${
                    isImproved
                      ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
                      : isRegressed
                      ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
                      : "bg-muted border-border"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">
                        #{example.index}
                      </span>
                      {isImproved && <TrendingUp className="h-4 w-4 text-green-600" />}
                      {isRegressed && <TrendingDown className="h-4 w-4 text-red-600" />}
                      {isUnchanged && <Minus className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {(example.baseline_score * 100).toFixed(0)}%
                      </span>
                      <span className="text-xs">→</span>
                      <span
                        className={`text-xs font-semibold ${
                          isImproved
                            ? "text-green-600"
                            : isRegressed
                            ? "text-red-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {(example.candidate_score * 100).toFixed(0)}%
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          isImproved
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : isRegressed
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : ""
                        }
                      >
                        {example.delta > 0 ? "+" : ""}
                        {(example.delta * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs">
                      <span className="font-semibold text-muted-foreground">Input: </span>
                      <span className="text-foreground">
                        {typeof example.input === "string"
                          ? example.input.substring(0, 100)
                          : JSON.stringify(example.input).substring(0, 100)}
                        {(typeof example.input === "string" ? example.input : JSON.stringify(example.input)).length > 100 && "..."}
                      </span>
                    </div>
                    {example.expected_output && (
                      <div className="text-xs">
                        <span className="font-semibold text-muted-foreground">Expected: </span>
                        <span className="text-foreground">
                          {typeof example.expected_output === "string"
                            ? example.expected_output.substring(0, 100)
                            : JSON.stringify(example.expected_output).substring(0, 100)}
                          {(typeof example.expected_output === "string" ? example.expected_output : JSON.stringify(example.expected_output)).length > 100 && "..."}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

