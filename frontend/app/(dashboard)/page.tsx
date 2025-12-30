"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Database, BarChart3, Clock, TrendingUp, Award, Users } from "lucide-react";
import { fetchStats } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface EnhancedStats {
  counts: {
    prompts: number;
    datasets: number;
    evaluations: number;
    candidates: number;
    promotions: number;
  };
  average_scores: {
    correctness: number;
    format_adherence: number;
    clarity: number;
    safety: number;
  };
  recent_evaluations: Array<{
    id: string;
    prompt_version_id: string;
    dataset_id: string;
    status: string;
    aggregate_scores?: {
      correctness?: number;
      format_adherence?: number;
    };
    started_at?: string;
    completed_at?: string;
  }>;
  recent_promotions: Array<{
    id: string;
    prompts?: { name: string };
    from_version_id: string;
    to_version_id: string;
    metric_deltas?: any;
    created_at: string;
  }>;
  improvement_rate: number;
}

export default function Dashboard() {
  const [statsData, setStatsData] = useState<EnhancedStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await fetchStats();
        setStatsData(data);
      } catch (err) {
        console.error("Failed to load stats:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, []);

  const stats = [
    {
      title: "Active Prompts",
      value: isLoading || !statsData ? "..." : statsData.counts.prompts.toString(),
      icon: MessageSquare,
      description: "Total prompts created",
      link: "/prompts",
    },
    {
      title: "Datasets",
      value: isLoading || !statsData ? "..." : statsData.counts.datasets.toString(),
      icon: Database,
      description: "Total datasets for evaluation",
      link: "/datasets",
    },
    {
      title: "Evaluations",
      value: isLoading || !statsData ? "..." : statsData.counts.evaluations.toString(),
      icon: BarChart3,
      description: "Total evaluation runs",
      link: "/evaluations",
    },
    {
      title: "Avg Correctness",
      value: isLoading || !statsData ? "..." : `${(statsData.average_scores.correctness * 100).toFixed(1)}%`,
      icon: TrendingUp,
      description: "Average across all evaluations",
    },
    {
      title: "Avg Format Score",
      value: isLoading || !statsData ? "..." : `${(statsData.average_scores.format_adherence * 100).toFixed(1)}%`,
      icon: Award,
      description: "Format adherence rate",
    },
    {
      title: "Improvement Rate",
      value: isLoading || !statsData ? "..." : `${statsData.improvement_rate}%`,
      icon: Users,
      description: "Promotion success rate",
    },
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      running: "secondary",
      pending: "outline",
      failed: "destructive",
    };
    return (
      <Badge variant={variants[status] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title} className={stat.link ? "hover:bg-muted/50 transition-colors" : ""}>
            <Link href={stat.link || "#"} className={!stat.link ? "pointer-events-none" : ""}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Evaluations</CardTitle>
          </CardHeader>
          <CardContent>
            {!statsData || statsData.recent_evaluations.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <Clock className="h-8 w-8 opacity-20" />
                  <p>No recent evaluations found</p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Correctness</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statsData.recent_evaluations.map((evaluation) => (
                    <TableRow key={evaluation.id}>
                      <TableCell>{getStatusBadge(evaluation.status)}</TableCell>
                      <TableCell>
                        {evaluation.aggregate_scores?.correctness !== undefined
                          ? `${(evaluation.aggregate_scores.correctness * 100).toFixed(1)}%`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {evaluation.aggregate_scores?.format_adherence !== undefined
                          ? `${(evaluation.aggregate_scores.format_adherence * 100).toFixed(1)}%`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Link href={`/evaluations/${evaluation.id}`} className="text-primary hover:underline text-sm">
                          View
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Improvements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!statsData || statsData.recent_promotions.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                <TrendingUp className="h-8 w-8 opacity-20 mx-auto mb-2" />
                <p>No improvements yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {statsData.recent_promotions.map((promotion) => (
                  <div key={promotion.id} className="flex flex-col space-y-1 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {promotion.prompts?.name || "Unknown Prompt"}
                      </span>
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                    {promotion.metric_deltas?.correctness && (
                      <span className="text-xs text-green-600">
                        +{(promotion.metric_deltas.correctness * 100).toFixed(1)}% correctness
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(promotion.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="pt-4 space-y-2 border-t">
              <div className="text-sm font-medium text-muted-foreground mb-3">
                Quick Actions
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 hover:underline cursor-pointer">
                  <Link href="/prompts/new" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Create a prompt
                  </Link>
                </li>
                <li className="flex items-center gap-2 hover:underline cursor-pointer">
                  <Link href="/datasets" className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Import dataset
                  </Link>
                </li>
                <li className="flex items-center gap-2 hover:underline cursor-pointer">
                  <Link href="/evaluations" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Run evaluation
                  </Link>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
