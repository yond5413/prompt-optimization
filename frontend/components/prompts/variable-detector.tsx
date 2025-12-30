"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Variable } from "lucide-react";

interface VariableDetectorProps {
  promptContent: string;
  className?: string;
}

export function extractVariables(content: string): string[] {
  if (!content) return [];
  
  // Pattern matches {variable_name} where variable_name is a valid identifier
  const pattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
  const matches = content.matchAll(pattern);
  
  // Remove duplicates while preserving order
  const seen = new Set<string>();
  const variables: string[] = [];
  
  for (const match of matches) {
    const varName = match[1];
    if (!seen.has(varName)) {
      seen.add(varName);
      variables.push(varName);
    }
  }
  
  return variables;
}

export function VariableDetector({ promptContent, className }: VariableDetectorProps) {
  const variables = extractVariables(promptContent);

  if (variables.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Variable className="h-4 w-4" />
          Detected Variables
        </CardTitle>
        <CardDescription className="text-xs">
          Variables found in your prompt that can be mapped to dataset columns
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {variables.map((variable) => (
            <Badge key={variable} variant="secondary" className="font-mono">
              {`{${variable}}`}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

