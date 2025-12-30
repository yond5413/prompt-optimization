"use client";

import { Editor } from "@monaco-editor/react";
import { Card, CardContent } from "@/components/ui/card";

interface PromptEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}

export default function PromptEditor({ value, onChange, readOnly = false }: PromptEditorProps) {
  return (
    <Card className="overflow-hidden border-none shadow-none">
      <CardContent className="p-0">
        <div className="border rounded-md overflow-hidden bg-[#1e1e1e]">
          <Editor
            height="400px"
            defaultLanguage="markdown"
            value={value}
            onChange={(val) => onChange?.(val || "")}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: "on",
              padding: { top: 16, bottom: 16 },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              readOnly: readOnly,
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

