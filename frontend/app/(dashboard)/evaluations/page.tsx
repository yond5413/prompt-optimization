import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EvaluationsPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Evaluations</h2>
          <p className="text-muted-foreground">
            View evaluation results, compare versions, and track metrics
          </p>
        </div>
        <Button>
          <Play className="mr-2 h-4 w-4" /> New Evaluation Run
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
            <BarChart3 className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold">No evaluations yet</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Run an evaluation on a prompt version using one of your datasets to see performance metrics.
          </p>
          <Button>Run your first evaluation</Button>
        </CardContent>
      </Card>
    </div>
  );
}

