"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { ArrowLeft, GitCommit, Clock, CheckCircle2, TrendingUp, Zap, Award } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { fetchPrompt, fetchPromptVersions, fetchCandidates, rejectCandidate, fetchPromotionHistory, fetchPromptPerformance, promoteCandidate } from "@/lib/api";
import PromptEditor from "@/components/PromptEditor";
import ImprovementDialog from "@/components/ImprovementDialog";
import PromptDiff from "@/components/PromptDiff";
import CandidateComparisonCard from "@/components/CandidateComparisonCard";
import PerformanceChart from "@/components/PerformanceChart";

interface Prompt {
  id: string;
  name: string;
  description: string;
  task_type: string;
  output_schema: any;
  created_at: string;
}

interface PromptVersion {
  id: string;
  version: number;
  content: string;
  is_active: boolean;
  created_at: string;
  rationale?: string;
  generation_method?: string;
}

export default function PromptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<PromptVersion | null>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [promptData, versionsData, candidatesData, promotionsData, performanceData] = await Promise.all([
          fetchPrompt(id),
          fetchPromptVersions(id),
          fetchCandidates(id),
          fetchPromotionHistory(id),
          fetchPromptPerformance(id),
        ]);
        setPrompt(promptData);
        setVersions(versionsData);
        setCandidates(candidatesData);
        setPromotions(promotionsData);
        setPerformance(performanceData);

        // Find active version or use the latest one
        const active = versionsData.find((v: PromptVersion) => v.is_active) || versionsData[0];
        setActiveVersion(active);
      } catch (err) {
        console.error("Failed to load prompt details:", err);
        setError("Failed to load prompt details. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();

    // Listen for prompt updates
    const handlePromptUpdate = () => {
      loadData();
    };
    window.addEventListener("prompt-updated", handlePromptUpdate);
    return () => window.removeEventListener("prompt-updated", handlePromptUpdate);
  }, [id]);

  const notifyPromptUpdate = () => {
    window.dispatchEvent(new CustomEvent("prompt-updated"));
  };

  const handleImprovementComplete = async (result: any) => {
    notifyPromptUpdate();
    // Reload data after improvement
    try {
      const [versionsData, candidatesData, promotionsData] = await Promise.all([
        fetchPromptVersions(id),
        fetchCandidates(id),
        fetchPromotionHistory(id),
      ]);
      setVersions(versionsData);
      setCandidates(candidatesData);
      setPromotions(promotionsData);

      // Update active version if auto-promoted
      const active = versionsData.find((v: PromptVersion) => v.is_active) || versionsData[0];
      setActiveVersion(active);
    } catch (err) {
      console.error("Failed to reload data after improvement:", err);
    }
  };

  const handlePromoteCandidate = async (candidateId: string, promptId: string) => {
    try {
      await promoteCandidate({
        prompt_id: promptId,
        candidate_id: candidateId,
        reason: "Promoted from prompt detail page"
      });

      toast.success("Candidate promoted successfully!");
      notifyPromptUpdate();

      // Reload data
      const [versionsData, candidatesData, promotionsData] = await Promise.all([
        fetchPromptVersions(id),
        fetchCandidates(id),
        fetchPromotionHistory(id),
      ]);
      setVersions(versionsData);
      setCandidates(candidatesData);
      setPromotions(promotionsData);

      // Update active version
      const active = versionsData.find((v: PromptVersion) => v.is_active) || versionsData[0];
      setActiveVersion(active);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to promote candidate");
    }
  };

  const handleRejectCandidate = async (candidateId: string) => {
    try {
      await rejectCandidate(candidateId);
      toast.success("Candidate rejected");
      // Reload candidates
      const candidatesData = await fetchCandidates(id);
      setCandidates(candidatesData);
    } catch (err) {
      toast.error("Failed to reject candidate");
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-8 pt-6 space-y-4">
        <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
        <div className="grid gap-4 md:grid-cols-4">
          <div className="h-24 animate-pulse rounded-md bg-muted md:col-span-1" />
          <div className="h-24 animate-pulse rounded-md bg-muted md:col-span-1" />
          <div className="h-24 animate-pulse rounded-md bg-muted md:col-span-1" />
        </div>
        <div className="h-[500px] animate-pulse rounded-md bg-muted" />
      </div>
    );
  }

  if (error || !prompt) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-red-500">{error || "Prompt not found"}</p>
        <Button asChild variant="outline">
          <Link href="/prompts">Back to Prompts</Link>
        </Button>
      </div>
    );
  }

  const pendingCandidates = candidates.filter(c => c.status === "pending");
  const archivedCandidates = candidates.filter(c => c.status !== "pending");

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/prompts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{prompt.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {prompt.description || "No description provided"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeVersion && (
            <Badge variant="outline" className="text-xs">
              Active: v{activeVersion.version}
            </Badge>
          )}
          <ImprovementDialog
            promptId={id}
            promptName={prompt.name}
            baseVersionId={activeVersion?.id}
            onImprovementComplete={handleImprovementComplete}
          >
            <Button>
              <Zap className="h-4 w-4 mr-2" />
              Improve Prompt
            </Button>
          </ImprovementDialog>
        </div>
      </div>

      <Tabs defaultValue="versions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="versions">Versions ({versions.length})</TabsTrigger>
          <TabsTrigger value="candidates">Candidates ({pendingCandidates.length})</TabsTrigger>
          <TabsTrigger value="archive">Archive ({archivedCandidates.length})</TabsTrigger>
          <TabsTrigger value="history">Promotion History</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
          <div className="md:col-span-2 lg:col-span-3 space-y-6">
            <TabsContent value="versions" className="m-0">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-xl">Current Prompt Version</CardTitle>
                    {activeVersion && (
                      <Badge variant="outline" className="font-mono">
                        ID: {activeVersion.id.substring(0, 8)}
                      </Badge>
                    )}
                  </div>
                  <CardDescription>
                    This is the currently active version of your prompt.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="min-h-[500px]">
                    {activeVersion ? (
                      <PromptEditor
                        value={activeVersion.content}
                        readOnly={true}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No version selected
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="candidates" className="m-0 space-y-4">
              <div className="flex flex-col space-y-1.5 mb-4">
                <h3 className="text-2xl font-semibold leading-none tracking-tight">Pending Candidates</h3>
                <p className="text-sm text-muted-foreground">Review and promote AI-generated improvements to your prompt</p>
              </div>
              {pendingCandidates.length > 0 ? (
                <div className="grid gap-6">
                  {pendingCandidates.map((candidate) => (
                    <CandidateComparisonCard
                      key={candidate.id}
                      candidateId={candidate.id}
                      baselineVersionId={candidate.parent_version_id || activeVersion?.id || ""}
                      candidateContent={candidate.content}
                      candidateRationale={candidate.rationale}
                      candidateScores={candidate.evaluation_scores}
                      candidateStatus={candidate.status}
                      baselineContent={activeVersion?.content}
                      onPromote={() => handlePromoteCandidate(candidate.id, id)}
                      onReject={() => handleRejectCandidate(candidate.id)}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Award className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
                    <h3 className="text-lg font-medium">No Pending Candidates</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mt-1">
                      Run an improvement loop to generate new prompt candidates.
                    </p>
                    <div className="mt-6">
                      <ImprovementDialog
                        promptId={id}
                        promptName={prompt.name}
                        baseVersionId={activeVersion?.id}
                        onImprovementComplete={handleImprovementComplete}
                      >
                        <Button>
                          <Zap className="h-4 w-4 mr-2" />
                          Improve Prompt
                        </Button>
                      </ImprovementDialog>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="archive" className="m-0 space-y-4">
              <div className="flex flex-col space-y-1.5 mb-4">
                <h3 className="text-2xl font-semibold leading-none tracking-tight">Archived Candidates</h3>
                <p className="text-sm text-muted-foreground">Candidates that have been promoted or rejected.</p>
              </div>
              {archivedCandidates.length > 0 ? (
                <div className="grid gap-6">
                  {archivedCandidates.map((candidate) => (
                    <CandidateComparisonCard
                      key={candidate.id}
                      candidateId={candidate.id}
                      baselineVersionId={candidate.parent_version_id || activeVersion?.id || ""}
                      candidateContent={candidate.content}
                      candidateRationale={candidate.rationale}
                      candidateScores={candidate.evaluation_scores}
                      candidateStatus={candidate.status}
                      baselineContent={activeVersion?.content}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Clock className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
                    <h3 className="text-lg font-medium">Archive Empty</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mt-1">
                      Once candidates are promoted or rejected, they will appear here.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="history" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Promotion History</CardTitle>
                </CardHeader>
                <CardContent>
                  {promotions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Clock className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
                      <p className="text-muted-foreground">No promotions yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {promotions.map((promotion) => (
                        <Card key={promotion.id}>
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between">
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2">
                                  <TrendingUp className="h-4 w-4 text-green-500" />
                                  <span className="text-sm font-medium">Version Promoted</span>
                                </div>
                                {promotion.reason && (
                                  <p className="text-sm text-muted-foreground">{promotion.reason}</p>
                                )}
                                {promotion.metric_deltas && Object.keys(promotion.metric_deltas).length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {Object.entries(promotion.metric_deltas).map(([key, value]) => (
                                      <Badge key={key} variant="outline" className="text-xs">
                                        {key}: {(value as number) > 0 ? '+' : ''}{((value as number) * 100).toFixed(1)}%
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="text-right space-y-1">
                                <Badge variant="secondary">{promotion.promoted_by}</Badge>
                                <p className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(promotion.created_at))} ago
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  {performance ? (
                    <div className="space-y-6">
                      <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Versions</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{performance.versions}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Avg Improvement</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                              +{performance.improvement_over_time}%
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">85%</div>
                          </CardContent>
                        </Card>
                      </div>
                      <div className="h-[400px] w-full border rounded-xl p-6 bg-card/50 backdrop-blur-sm shadow-inner">
                        <PerformanceChart history={performance.performance_history} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <TrendingUp className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
                      <p className="text-muted-foreground">No performance data available yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>

          {/* Sidebar - Version History */}
          <div className="md:col-span-1 space-y-6">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl">Version History</CardTitle>
                <CardDescription>
                  Track changes and improvements
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                <ScrollArea className="h-[600px]">
                  <div className="flex flex-col">
                    {versions.map((version) => (
                      <div
                        key={version.id}
                        className={`
                          group flex flex-col gap-2 p-4 border-l-2 hover:bg-muted/50 transition-colors cursor-pointer
                          ${activeVersion?.id === version.id
                            ? "border-primary bg-muted/30"
                            : "border-transparent"
                          }
                        `}
                        onClick={() => setActiveVersion(version)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <GitCommit className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold text-sm">v{version.version}</span>
                            {version.is_active && (
                              <Badge variant="default" className="text-[10px] h-5 px-1.5">
                                Active
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(version.created_at))} ago
                          </span>
                        </div>

                        {version.rationale && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {version.rationale}
                          </p>
                        )}

                        {version.generation_method && (
                          <Badge variant="outline" className="w-fit text-[10px] h-5 px-1.5 capitalize">
                            {version.generation_method}
                          </Badge>
                        )}
                      </div>
                    ))}
                    {versions.length === 0 && (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No history available
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
