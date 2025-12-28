import { Button } from "@/components/ui/button";
import { Plus, Database, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function DatasetsPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Datasets</h2>
          <p className="text-muted-foreground">
            Manage evaluation datasets and import from Hugging Face
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Search className="mr-2 h-4 w-4" /> Import from HF
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Upload Dataset
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Placeholder for dataset list or filters */}
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
            <Database className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold">No datasets yet</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Import a dataset from Hugging Face or upload your own CSV/JSONL file to start evaluating prompts.
          </p>
          <div className="flex gap-4">
            <Button variant="outline">Browse Hugging Face</Button>
            <Button>Upload Dataset</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

