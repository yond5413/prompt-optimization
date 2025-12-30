"use client";

import { use, useEffect, useState } from "react";
import { fetchDataset, fetchDatasetSamples } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowLeft, Database, FileText, Calendar } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Dataset {
  id: string;
  name: string;
  description: string;
  source: string;
  column_schema: any;
  created_at: string;
}

interface Sample {
  id: string;
  input: any;
  expected_output: any;
  metadata: any;
}

export default function DatasetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [datasetData, samplesData] = await Promise.all([
          fetchDataset(id),
          fetchDatasetSamples(id)
        ]);
        setDataset(datasetData);
        setSamples(samplesData);
      } catch (err: any) {
        console.error("Error loading dataset:", err);
        setError(err.message || "Failed to load dataset");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-40 col-span-2" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !dataset) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Error Loading Dataset</h2>
        <p className="text-muted-foreground">{error || "Dataset not found"}</p>
        <Button asChild>
          <Link href="/datasets">Back to Datasets</Link>
        </Button>
      </div>
    );
  }

  // Determine columns to display
  // For manual datasets, we use the column_schema
  // For others, we try to infer from the first sample
  let displayColumns: string[] = [];
  if (dataset.column_schema?.columns) {
    displayColumns = Object.keys(dataset.column_schema.columns);
  } else if (samples.length > 0) {
    // If input is an object, use its keys. Otherwise just 'input'
    const firstInput = samples[0].input;
    if (typeof firstInput === 'object' && firstInput !== null) {
      displayColumns = Object.keys(firstInput);
    } else {
      displayColumns = ['input'];
    }

    // Always include expected_output if it exists in any sample
    if (samples.some(s => s.expected_output !== undefined && s.expected_output !== null)) {
      displayColumns.push('expected_output');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/datasets">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">{dataset.name}</h1>
        <Badge variant="secondary" className="capitalize">
          {dataset.source}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {dataset.description || "No description provided."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Samples</span>
              <span className="text-2xl font-bold">{samples.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Created
              </span>
              <span className="text-sm">
                {new Date(dataset.created_at).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Samples</CardTitle>
        </CardHeader>
        <CardContent>
          {samples.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No samples found in this dataset.
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    {displayColumns.map(col => (
                      <TableHead key={col} className="capitalize">
                        {col.replace(/_/g, ' ')}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {samples.map((sample) => (
                    <TableRow key={sample.id}>
                      {displayColumns.map(col => {
                        let value;
                        if (col === 'expected_output') {
                          value = sample.expected_output;
                        } else if (typeof sample.input === 'object' && sample.input !== null) {
                          value = sample.input[col];
                        } else if (col === 'input') {
                          value = sample.input;
                        }

                        // Handle objects/arrays for display
                        const displayValue = typeof value === 'object' && value !== null
                          ? JSON.stringify(value)
                          : String(value ?? '-');

                        return (
                          <TableCell key={col} className="max-w-md truncate" title={displayValue}>
                            {displayValue}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

