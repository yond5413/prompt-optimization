import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileText, Calculator, Mail, Search, Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/lib/supabase";

interface CreateDatasetDialogProps {
  children: React.ReactNode;
  onDatasetCreated: () => void;
}

const STARTER_DATASETS = [
  {
    id: "support_email_3",
    name: "Support Email (3 Assignees)",
    description: "Route support emails to Billing, Technical, or Product.",
    icon: Mail
  },
  {
    id: "support_email_10",
    name: "Support Email (10 Assignees)",
    description: "Complex routing to 10 distinct departments.",
    icon: Mail
  },
  {
    id: "multilingual_math",
    name: "Multilingual Math",
    description: "Solve math problems in multiple languages.",
    icon: Calculator
  },
  {
    id: "email_assistant_simple",
    name: "Email Assistant (Simple)",
    description: "Draft professional business emails.",
    icon: FileText
  },
  {
    id: "email_assistant_eccentric",
    name: "Email Assistant (Eccentric)",
    description: "Draft emails with unique personas (Pirate, etc.).",
    icon: FileText
  }
];

export function CreateDatasetDialog({ children, onDatasetCreated }: CreateDatasetDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  
  // Upload state
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // Hugging Face state
  const [hfQuery, setHfQuery] = useState("");
  const [hfResults, setHfResults] = useState<any[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<any>(null);
  const [hfConfigs, setHfConfigs] = useState<string[]>([]);
  const [hfSplits, setHfSplits] = useState<string[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<string>("");
  const [selectedSplit, setSelectedSplit] = useState<string>("");

  // Helper to get auth headers
  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error("Not authenticated");
    }
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`
    };
  };

  const handleCreateStarter = async (starterId: string) => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${apiUrl}/api/datasets`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "", // Name will be set by backend based on starter info
          source: "starter",
          starter_id: starterId
        })
      });
      
      if (!response.ok) throw new Error("Failed to create dataset");
      
      setOpen(false);
      onDatasetCreated();
    } catch (error) {
      console.error(error);
      alert("Error creating dataset");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name) return;

    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      
      // 1. Create Dataset
      const createResponse = await fetch(`${apiUrl}/api/datasets`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name,
          source: "local"
        })
      });
      
      if (!createResponse.ok) throw new Error("Failed to create dataset");
      const dataset = await createResponse.json();

      // 2. Upload File
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch(`${apiUrl}/api/datasets/${dataset.id}/upload`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: formData
      });

      if (!uploadResponse.ok) throw new Error("Failed to upload file");

      setOpen(false);
      onDatasetCreated();
    } catch (error) {
      console.error(error);
      alert("Error uploading dataset");
    } finally {
      setLoading(false);
    }
  };

  const searchHf = async () => {
    if (!hfQuery) return;
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${apiUrl}/api/datasets/hf/search?query=${encodeURIComponent(hfQuery)}`, {
        headers
      });
      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();
      setHfResults(data);
    } catch (error) {
      console.error(error);
      alert("Error searching Hugging Face");
    } finally {
      setLoading(false);
    }
  };

  const selectHfRepo = async (repo: any) => {
    setSelectedRepo(repo);
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${apiUrl}/api/datasets/hf/info/${repo.id}`, {
        headers
      });
      if (!response.ok) throw new Error("Failed to get dataset info");
      const data = await response.json();
      setHfConfigs(data.configs || []);
      setHfSplits(data.splits || []);
      if (data.configs?.length) setSelectedConfig(data.configs[0]);
      if (data.splits?.length) setSelectedSplit(data.splits[0]);
    } catch (error) {
      console.error(error);
      alert("Error fetching dataset details");
    } finally {
      setLoading(false);
    }
  };

  const importHfDataset = async () => {
    if (!selectedRepo) return;
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${apiUrl}/api/datasets/hf/import?repo_id=${encodeURIComponent(selectedRepo.id)}&config_name=${selectedConfig}&split=${selectedSplit}`, {
        method: "POST",
        headers
      });
      
      if (!response.ok) throw new Error("Import failed");
      
      setOpen(false);
      onDatasetCreated();
    } catch (error) {
      console.error(error);
      alert("Error importing dataset");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Dataset</DialogTitle>
          <DialogDescription>
            Choose a starter dataset, upload your own, or import from Hugging Face.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="starter" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="starter">Starter Datasets</TabsTrigger>
            <TabsTrigger value="upload">Upload File</TabsTrigger>
            <TabsTrigger value="hf">Hugging Face</TabsTrigger>
          </TabsList>
          
          <TabsContent value="starter" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              {STARTER_DATASETS.map((dataset) => (
                <Card 
                  key={dataset.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleCreateStarter(dataset.id)}
                >
                  <CardHeader className="p-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <dataset.icon className="h-4 w-4" />
                      {dataset.name}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {dataset.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="upload">
            <form onSubmit={handleUpload} className="space-y-4 mt-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">Dataset Name</label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="My Custom Dataset" 
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="file" className="text-sm font-medium">File (CSV or JSONL)</label>
                <Input 
                  id="file" 
                  type="file" 
                  accept=".csv,.jsonl" 
                  onChange={(e) => setFile(e.target.files?.[0] || null)} 
                  required 
                />
                <p className="text-xs text-muted-foreground">
                  CSV must have header row. Supported columns: input, expected_output.
                </p>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                  {loading ? "Uploading..." : "Create & Upload"}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="hf" className="space-y-4 mt-4">
            {!selectedRepo ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    placeholder="Search datasets (e.g. squad, glue)" 
                    value={hfQuery}
                    onChange={(e) => setHfQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchHf()}
                  />
                  <Button onClick={searchHf} disabled={loading}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                
                <ScrollArea className="h-[300px] border rounded-md p-2">
                  <div className="space-y-2">
                    {hfResults.map((repo) => (
                      <div 
                        key={repo.id}
                        className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer border"
                        onClick={() => selectHfRepo(repo)}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{repo.id}</span>
                          <span className="text-xs text-muted-foreground">
                            {repo.downloads} downloads • {repo.author || "Unknown"}
                          </span>
                        </div>
                        <Button variant="ghost" size="sm">Select</Button>
                      </div>
                    ))}
                    {hfResults.length === 0 && hfQuery && !loading && (
                      <div className="text-center text-sm text-muted-foreground py-4">No results found</div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedRepo(null)}>← Back</Button>
                  <h3 className="font-medium">{selectedRepo.id}</h3>
                </div>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Configuration</label>
                    <Select value={selectedConfig} onValueChange={setSelectedConfig}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select config" />
                      </SelectTrigger>
                      <SelectContent portal={false}>
                        {hfConfigs.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Split</label>
                    <Select value={selectedSplit} onValueChange={setSelectedSplit}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select split" />
                      </SelectTrigger>
                      <SelectContent portal={false}>
                        {hfSplits.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={importHfDataset} disabled={loading}>
                    {loading ? "Importing..." : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Import Dataset
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

