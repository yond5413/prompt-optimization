"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { fetchPrompts } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

interface Prompt {
  id: string;
  name: string;
  task_type: string;
  created_at: string;
  user_id?: string;
  input_schema?: any;
  output_schema?: any;
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPrompts() {
      try {
        const data = await fetchPrompts();
        setPrompts(data);
      } catch (err) {
        console.error("Failed to load prompts:", err);
        setError("Failed to load prompts. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    loadPrompts();
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Prompts</h2>
            <p className="text-muted-foreground">Loading prompts...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Prompts</h2>
            <p className="text-red-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Prompts</h2>
          <p className="text-muted-foreground">
            Manage your prompt versions and track improvements
          </p>
        </div>
        <Button asChild>
          <Link href="/prompts/new">
            <Plus className="mr-2 h-4 w-4" /> New Prompt
          </Link>
        </Button>
      </div>

      {prompts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
              <MessageSquare className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold">No prompts yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Create your first prompt to start optimizing and tracking version history.
            </p>
            <Button asChild variant="outline">
              <Link href="/prompts/new">Create your first prompt</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {prompts.map((prompt) => (
            <Link key={prompt.id} href={`/prompts/${prompt.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{prompt.name}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                  </CardTitle>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
