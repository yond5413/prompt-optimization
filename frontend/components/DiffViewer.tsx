"use client";

import { diffLines } from "diff";

interface DiffViewerProps {
  oldText: string;
  newText: string;
}

export default function DiffViewer({ oldText, newText }: DiffViewerProps) {
  const diff = diffLines(oldText, newText);

  return (
    <div className="font-mono text-sm">
      {diff.map((part, index) => {
        const bgColor = part.added
          ? "bg-green-100 dark:bg-green-900/30"
          : part.removed
          ? "bg-red-100 dark:bg-red-900/30"
          : "bg-transparent";

        return (
          <div key={index} className={bgColor}>
            {part.value.split("\n").map((line, lineIndex) => (
              <div key={lineIndex} className="px-2 py-1">
                {part.added && <span className="text-green-600">+ </span>}
                {part.removed && <span className="text-red-600">- </span>}
                {!part.added && !part.removed && <span className="text-gray-400">  </span>}
                {line}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

