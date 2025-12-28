"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface Version {
  id: string;
  version: number;
  content: string;
  is_active: boolean;
  created_at: string;
  parent_version_id?: string;
  generation_method?: string;
}

interface VersionTimelineProps {
  versions: Version[];
}

export default function VersionTimeline({ versions }: VersionTimelineProps) {
  return (
    <div className="space-y-4">
      {versions.map((version) => (
        <Card
          key={version.id}
          className={`${
            version.is_active
              ? "border-primary bg-primary/5"
              : "border-border"
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">
                Version {version.version}
              </CardTitle>
              <CardDescription className="text-xs">
                {version.generation_method && (
                  <Badge variant="outline" className="mr-2 capitalize">
                    {version.generation_method.replace("_", " ")}
                  </Badge>
                )}
                {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
              </CardDescription>
            </div>
            {version.is_active && (
              <Badge variant="default" className="bg-primary">
                Active
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-3 font-mono bg-muted p-2 rounded">
              {version.content}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
