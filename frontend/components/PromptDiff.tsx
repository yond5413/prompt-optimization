"use client";

import { useMemo } from "react";
import { diffWords } from "diff";

interface PromptDiffProps {
  original: string;
  modified: string;
  showLineNumbers?: boolean;
}

export default function PromptDiff({ original, modified, showLineNumbers = false }: PromptDiffProps) {
  const diffResult = useMemo(() => {
    return diffWords(original ?? "", modified ?? "");
  }, [original, modified]);

  // Calculate stats
  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    diffResult.forEach((part) => {
      if (part.added) added += part.value.length;
      if (part.removed) removed += part.value.length;
    });
    return { added, removed };
  }, [diffResult]);

  return (
    <div className="space-y-2">
      {/* Stats Bar */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="text-green-600 dark:text-green-400">+{stats.added} chars added</span>
        <span className="text-red-600 dark:text-red-400">-{stats.removed} chars removed</span>
      </div>

      {/* Diff Content */}
      <div className="font-mono text-sm p-4 rounded-lg border bg-muted/30 overflow-x-auto whitespace-pre-wrap">
        {diffResult.length > 0 ? (
          diffResult.map((part, index) => {
            if (part.added) {
              return (
                <span
                  key={index}
                  className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200"
                >
                  {part.value}
                </span>
              );
            }
            if (part.removed) {
              return (
                <span
                  key={index}
                  className="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 line-through"
                >
                  {part.value}
                </span>
              );
            }
            return <span key={index}>{part.value}</span>;
          })
        ) : (
          <div className="text-muted-foreground italic text-center py-4">
            {original === modified && original !== "" ? "No changes detected" : "No content available"}
          </div>
        )}
      </div>
    </div>
  );
}

