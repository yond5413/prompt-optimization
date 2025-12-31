"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, GitCommit, Clock, CheckCircle2, TrendingUp, Zap, Award } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { fetchPrompt, fetchPromptVersions, fetchCandidates, fetchPromotionHistory, fetchPromptPerformance, promoteCandidate } from "@/lib/api";
import PromptEditor from "@/components/PromptEditor";
import ImprovementDialog from "@/components/ImprovementDialog";
import PromptDiff from "@/components/PromptDiff";
import CandidateComparisonCard from "@/components/CandidateComparisonCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface Prompt {
  id: string;
  name: string;
  task_type: string;
  created_at: string;
  user_id?: string;
}

interface PromptVersion {
  id: string;
  version: number;
  content: string;
  created_at: string;
  rationale?: string;
  is_active: boolean;
  generation_method?: string;
}

interface Candidate {
  id: string;
  content: string;
  rationale: string;
  generation_method: string;
  status: string;
  created_at: string;
}

interface Promotion {
  id: string;
  from_version_id: string;
  to_version_id: string;
  reason: string;
  metric_deltas?: any;
  created_at: string;
  promoted_by: string;
}

export default function PromptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<PromptVersion | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
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
  }, [id]);

  const handleImprovementComplete = async (result: any) => {
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

  const handlePromoteCandidate = async (candidateId: string) => {
    if (!prompt) return;

    try {
      await promoteCandidate({
        prompt_id: prompt.id,
        candidate_id: candidateId,
        reason: "Manual promotion",
      });

      toast.success("Candidate promoted successfully!");

      // Reload data
      const [versionsData, candidatesData, promotionsData] = await Promise.all([
        fetchPromptVersions(id),
        fetchCandidates(id),
        fetchPromotionHistory(id),
      ]);
      setVersions(versionsData);
      setCandidates(candidatesData);
      setPromotions(promotionsData);

      const active = versionsData.find((v: PromptVersion) => v.is_active) || versionsData[0];
      setActiveVersion(active);
    } catch (err) {
      console.error("Failed to promote candidate:", err);
      toast.error("Failed to promote candidate");
    }
  };

  const handleRejectCandidate = async (candidateId: string) => {
    // TODO: Add reject endpoint
    toast.success("Candidate rejected");
    // Reload candidates
    const candidatesData = await fetchCandidates(id);
    setCandidates(candidatesData);
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center space-x-4">
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2 space-y-4">
            <div className="h-[400px] animate-pulse rounded-md bg-muted" />
          </div>
          <div className="h-[400px] animate-pulse rounded-md bg-muted" />
        </div>
      </div>
    );
  }

  if (error || !prompt) {
    return (
      <div className="flex-1 p-8 pt-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <h2 className="text-2xl font-bold text-red-500">Error</h2>
          <p className="text-muted-foreground">{error || "Prompt not found"}</p>
          <Button asChild variant="outline">
            <Link href="/prompts">Return to Prompts</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/prompts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold tracking-tight">{prompt.name}</h2>
              <Badge variant="secondary" className="capitalize">
                {prompt.task_type}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              Created {formatDistanceToNow(new Date(prompt.created_at))} ago
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <ImprovementDialog
            promptId={prompt.id}
            promptName={prompt.name}
            onImprovementComplete={handleImprovementComplete}
          >
            <Button>
              <Zap className="h-4 w-4 mr-2" />
              Improve Prompt
            </Button>
          </ImprovementDialog>
        </div>
      </div>

      {/* Performance Summary */}
      {performance && performance.performance_history.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Versions</CardTitle>
              <GitCommit className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{performance.versions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Improvement Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${performance.improvement_over_time > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                {performance.improvement_over_time > 0 ? '+' : ''}{performance.improvement_over_time}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Candidates</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {candidates.filter(c => c.status === 'pending').length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
        {/* Main Content */}
        <div className="md:col-span-2 lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="content">Active Version</TabsTrigger>
                  <TabsTrigger value="candidates">
                    Candidates
                    {candidates.filter(c => c.status === 'pending').length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {candidates.filter(c => c.status === 'pending').length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="history">Promotion History</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <CardTitle className="text-xl">Current Prompt Version</CardTitle>
                    {activeVersion && (
                      <Badge variant="outline" className="font-mono">
                        v{activeVersion.version}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="mb-4">
                    This is the currently active version of your prompt.
                  </CardDescription>
                  <div className="min-h-[500px]">
                    {activeVersion ? (
                      <PromptEditor
                        value={activeVersion.content}
                        readOnly={true}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No versions available
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="candidates" className="mt-4">
                  <CardTitle className="text-xl mb-4">Pending Candidates</CardTitle>
                  <CardDescription className="mb-4">
                    Review and promote AI-generated improvements to your prompt
                  </CardDescription>
                  {candidates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Award className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
                      <p className="text-muted-foreground">No candidates generated yet</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Run an improvement loop to generate candidates
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {candidates.map((candidate) => (
                        <CandidateComparisonCard
                          key={candidate.id}
                          candidateId={candidate.id}
                          baselineVersionId={activeVersion?.id || ""}
                          baselineContent={activeVersion?.content}
                          candidateContent={candidate.content}
                          candidateRationale={candidate.rationale}
                          candidateScores={(candidate as any).evaluation_scores}
                          candidateStatus={candidate.status}
                          onPromote={() => handlePromoteCandidate(candidate.id)}
                          onReject={() => handleRejectCandidate(candidate.id)}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                  <CardTitle className="text-xl mb-4">Promotion History</CardTitle>
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
                </TabsContent>
              </Tabs>
            </CardHeader>
          </Card>
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
    </div>
  );
}
