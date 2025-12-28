"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Database, BarChart3, Clock } from "lucide-react";
import { fetchStats } from "@/lib/api";

export default function Dashboard() {
  const [statsData, setStatsData] = useState({
    prompts: 0,
    datasets: 0,
    evaluations: 0,
  });
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
      value: isLoading ? "..." : statsData.prompts.toString(),
      icon: MessageSquare,
      description: "Total prompts created",
    },
    {
      title: "Datasets",
      value: isLoading ? "..." : statsData.datasets.toString(),
      icon: Database,
      description: "Total datasets for evaluation",
    },
    {
      title: "Evaluations",
      value: isLoading ? "..." : statsData.evaluations.toString(),
      icon: BarChart3,
      description: "Total evaluation runs",
    },
  ];

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
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
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              <div className="flex flex-col items-center gap-2">
                <Clock className="h-8 w-8 opacity-20" />
                <p>No recent activity found</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Getting started? Try one of these:
            </div>
            <ul className="space-y-2 text-sm font-medium">
              <li className="flex items-center gap-2 hover:underline cursor-pointer">
                <Link href="/prompts/new" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Create your first prompt
                </Link>
              </li>
              <li className="flex items-center gap-2 hover:underline cursor-pointer">
                <Link href="/datasets" className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Import a dataset
                </Link>
              </li>
              <li className="flex items-center gap-2 hover:underline cursor-pointer">
                <Link href="/evaluations" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Run an evaluation
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
