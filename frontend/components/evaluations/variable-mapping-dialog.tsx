"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface VariableMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promptVariables: string[];
  datasetColumns: string[];
  onConfirm: (mapping: Record<string, string>) => void;
  sampleRow?: Record<string, any>;
}

export function VariableMappingDialog({
  open,
  onOpenChange,
  promptVariables,
  datasetColumns,
  onConfirm,
  sampleRow
}: VariableMappingDialogProps) {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<string[]>([]);

  // Auto-map variables that have matching column names
  useEffect(() => {
    if (open) {
      const autoMapping: Record<string, string> = {};
      promptVariables.forEach(variable => {
        // Try exact match first
        if (datasetColumns.includes(variable)) {
          autoMapping[variable] = variable;
        }
      });
      setMapping(autoMapping);
    }
  }, [open, promptVariables, datasetColumns]);

  const updateMapping = (variable: string, column: string) => {
    setMapping(prev => ({
      ...prev,
      [variable]: column
    }));
  };

  const validateMapping = (): boolean => {
    const newErrors: string[] = [];
    
    // Check all variables are mapped
    const unmapped = promptVariables.filter(v => !mapping[v]);
    if (unmapped.length > 0) {
      newErrors.push(`Unmapped variables: ${unmapped.join(", ")}`);
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleConfirm = () => {
    if (validateMapping()) {
      onConfirm(mapping);
      onOpenChange(false);
    }
  };

  const allMapped = promptVariables.every(v => mapping[v]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Map Variables to Dataset Columns</DialogTitle>
          <DialogDescription>
            Your prompt contains variables that need to be mapped to columns in your dataset.
            Select which dataset column should provide the value for each variable.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {errors.map((error, i) => (
                  <div key={i}>{error}</div>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {promptVariables.map((variable) => (
            <div key={variable} className="space-y-2">
              <Label htmlFor={`var-${variable}`} className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">
                  {`{${variable}}`}
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">maps to column:</span>
              </Label>
              <Select
                value={mapping[variable] || ""}
                onValueChange={(value) => updateMapping(variable, value)}
              >
                <SelectTrigger id={`var-${variable}`}>
                  <SelectValue placeholder="Select a column" />
                </SelectTrigger>
                <SelectContent>
                  {datasetColumns.map((column) => (
                    <SelectItem key={column} value={column}>
                      {column}
                      {sampleRow && sampleRow[column] && (
                        <span className="text-xs text-muted-foreground ml-2">
                          (e.g., "{String(sampleRow[column]).substring(0, 30)}...")
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}

          {sampleRow && allMapped && (
            <div className="mt-6 p-4 bg-muted rounded-lg space-y-2">
              <div className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Preview (using first row)
              </div>
              <div className="text-xs space-y-1 font-mono">
                {promptVariables.map((variable) => {
                  const column = mapping[variable];
                  const value = column ? sampleRow[column] : "";
                  return (
                    <div key={variable} className="flex gap-2">
                      <span className="text-muted-foreground">{`{${variable}}`}</span>
                      <span>→</span>
                      <span className="text-primary">"{String(value).substring(0, 50)}"</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!allMapped}>
            Confirm Mapping
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

