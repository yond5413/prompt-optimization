"use client";

import { Button } from "@/components/ui/button";
import { Plus, Database, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreateDatasetDialog } from "@/components/datasets/create-dataset-dialog";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Dataset {
  id: string;
  name: string;
  description: string;
  created_at: string;
  source: string;
}

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

  const fetchDatasets = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${apiUrl}/api/datasets`, {
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "application/json"
        }
      });
      if (res.ok) {
        setDatasets(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this dataset? This will also delete all associated samples and storage files.")) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${apiUrl}/api/datasets/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "application/json"
        }
      });

      if (res.ok) {
        setDatasets(datasets.filter(d => d.id !== id));
      } else {
        const error = await res.json();
        alert(`Failed to delete dataset: ${error.detail || "Unknown error"}`);
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred while deleting the dataset.");
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Datasets</h2>
          <p className="text-muted-foreground">
            Manage evaluation datasets.
          </p>
        </div>
        <div className="flex gap-2">
          <CreateDatasetDialog onDatasetCreated={fetchDatasets}>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Dataset
            </Button>
          </CreateDatasetDialog>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">Loading...</div>
      ) : datasets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
              <Database className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold">No datasets yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Add a starter dataset or upload your own CSV/JSONL file.
            </p>
            <div className="flex gap-4">
              <CreateDatasetDialog onDatasetCreated={fetchDatasets}>
                <Button>Add Dataset</Button>
              </CreateDatasetDialog>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {datasets.map((dataset) => (
            <Link href={`/datasets/${dataset.id}`} key={dataset.id}>
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors h-full">
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1">
                    <CardTitle>{dataset.name}</CardTitle>
                    <CardDescription className="line-clamp-2">{dataset.description || "No description"}</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={(e) => handleDelete(e, dataset.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">
                    Source: {dataset.source}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Created: {new Date(dataset.created_at).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
