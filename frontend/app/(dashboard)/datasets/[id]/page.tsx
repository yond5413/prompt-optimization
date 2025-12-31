"use client";

import { use, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ArrowLeft, Database, FileText, Calendar, Edit2, Check, X, Trash2, Plus, Columns } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  updateDataset,
  deleteDatasetRow,
  updateDatasetRow,
  addDatasetRows,
  updateDatasetColumns,
  fetchDataset,
  fetchDatasetSamples
} from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Dataset {
  id: string;
  name: string;
  description: string;
  source: string;
  column_schema: any;
  created_at: string;
}

interface Sample {
  id: string;
  input: any;
  expected_output: any;
  metadata: any;
}

export default function DatasetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Row editing state
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [tempRowData, setTempRowData] = useState<any>(null);
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [newRowData, setNewRowData] = useState<any>({});

  // Column editing state
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");

  // Staging state
  const [localSamples, setLocalSamples] = useState<Sample[]>([]);
  const [localSchema, setLocalSchema] = useState<any>(null);
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const [pendingAdds, setPendingAdds] = useState<any[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, Partial<Sample>>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [datasetData, samplesData] = await Promise.all([
          fetchDataset(id),
          fetchDatasetSamples(id)
        ]);
        setDataset(datasetData);
        setLocalSchema(datasetData.column_schema);
        setEditName(datasetData.name);
        setEditDescription(datasetData.description || "");
        setSamples(samplesData);
        setLocalSamples(samplesData);
      } catch (err: any) {
        console.error("Error loading dataset:", err);
        setError(err.message || "Failed to load dataset");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  useEffect(() => {
    const hasAnyChange =
      pendingDeletes.size > 0 ||
      pendingAdds.length > 0 ||
      Object.keys(pendingUpdates).length > 0 ||
      (dataset && (editName !== dataset.name || editDescription !== (dataset.description || ""))) ||
      JSON.stringify(localSchema) !== JSON.stringify(dataset?.column_schema);

    setHasChanges(!!hasAnyChange);
  }, [pendingDeletes, pendingAdds, pendingUpdates, editName, editDescription, localSchema, dataset]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  const handleSave = async () => {
    if (!dataset) return;
    try {
      setSaving(true);
      const updated = await updateDataset(id, {
        name: editName,
        description: editDescription
      });
      setDataset(updated);
      setIsEditing(false);
      toast.success("Dataset updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update dataset");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (dataset) {
      setEditName(dataset.name);
      setEditDescription(dataset.description || "");
    }
    setIsEditing(false);
  };

  const handleDeleteRow = (rowId: string) => {
    if (rowId.startsWith('new-')) {
      setPendingAdds(prev => prev.filter(a => a.id !== rowId));
    } else {
      setPendingDeletes(prev => {
        const next = new Set(prev);
        if (next.has(rowId)) {
          next.delete(rowId);
        } else {
          next.add(rowId);
        }
        return next;
      });
    }
  };

  const startEditRow = (sample: Sample) => {
    setEditingRowId(sample.id);
    const currentUpdate = pendingUpdates[sample.id];
    setTempRowData({
      input: currentUpdate?.input || { ...sample.input },
      expected_output: currentUpdate?.expected_output || (sample.expected_output ? { ...sample.expected_output } : {})
    });
  };

  const handleSaveRowEdit = (rowId: string) => {
    setPendingUpdates(prev => ({
      ...prev,
      [rowId]: {
        input: tempRowData.input,
        expected_output: tempRowData.expected_output
      }
    }));
    setEditingRowId(null);
  };

  const handleAddRow = () => {
    setPendingAdds(prev => [...prev, { ...newRowData, id: `new-${Date.now()}` }]);
    setIsAddingRow(false);
    setNewRowData({});
  };

  const handleAddColumn = () => {
    if (!newColumnName) return;

    const newSchema = {
      ...(localSchema || { columns: {} }),
      columns: {
        ...(localSchema?.columns || {}),
        [newColumnName]: { type: "text" }
      }
    };

    setLocalSchema(newSchema);
    setIsAddingColumn(false);
    setNewColumnName("");
  };

  const handleDiscardChanges = () => {
    if (!confirm("Discard all unsaved changes?")) return;
    setPendingDeletes(new Set());
    setPendingAdds([]);
    setPendingUpdates({});
    setLocalSchema(dataset?.column_schema);
    setHasChanges(false);
    setEditingRowId(null);
  };

  const handleGlobalSave = async () => {
    if (!dataset) return;
    try {
      setSaving(true);
      console.log("Starting global save...", {
        deletes: Array.from(pendingDeletes),
        updates: Object.keys(pendingUpdates),
        adds: pendingAdds.length,
        schemaChanged: JSON.stringify(localSchema) !== JSON.stringify(dataset.column_schema)
      });

      // 1. Handle Deletions
      for (const rowId of pendingDeletes) {
        if (!rowId.startsWith('new-')) {
          console.log(`Deleting row ${rowId}...`);
          await deleteDatasetRow(id, rowId);
        }
      }

      // 2. Handle Updates
      for (const [rowId, update] of Object.entries(pendingUpdates)) {
        if (!rowId.startsWith('new-')) {
          console.log(`Updating row ${rowId}...`, update);
          await updateDatasetRow(id, rowId, update);
        }
      }

      // 3. Handle Additions
      if (pendingAdds.length > 0) {
        console.log("Processing pending additions...", pendingAdds);
        const rowsToInsert = pendingAdds.map(({ id, ...flatRow }) => {
          const reqRow: any = { input: {}, expected_output: null, metadata: {} };

          Object.entries(flatRow).forEach(([key, val]) => {
            if (key === 'expected_output') {
              reqRow.expected_output = val;
            } else if (key === 'metadata') {
              reqRow.metadata = val;
            } else if (localSchema?.columns?.[key]) {
              reqRow.input[key] = val;
            } else if (key === 'input' && !localSchema?.columns) {
              reqRow.input = val;
            } else {
              if (typeof reqRow.input !== 'object' || reqRow.input === null) {
                reqRow.input = {};
              }
              reqRow.input[key] = val;
            }
          });
          return reqRow;
        });

        console.log("Inserting rows:", rowsToInsert);
        await addDatasetRows(id, rowsToInsert);
      }

      // 4. Handle Schema
      if (JSON.stringify(localSchema) !== JSON.stringify(dataset.column_schema)) {
        console.log("Updating column schema...", localSchema);
        await updateDatasetColumns(id, localSchema);
      }

      // 5. Handle Metadata
      if (editName !== dataset.name || editDescription !== (dataset.description || "")) {
        console.log("Updating metadata...");
        await updateDataset(id, { name: editName, description: editDescription });
      }

      toast.success("All changes saved successfully");

      // Refresh everything
      const [datasetData, samplesData] = await Promise.all([
        fetchDataset(id),
        fetchDatasetSamples(id)
      ]);
      setDataset(datasetData);
      setLocalSchema(datasetData.column_schema);
      setSamples(samplesData);
      setLocalSamples(samplesData);
      setPendingDeletes(new Set());
      setPendingAdds([]);
      setPendingUpdates({});
      setHasChanges(false);
      setIsEditing(false);

    } catch (err: any) {
      console.error("Global save failed:", err);
      toast.error(err.message || "Failed to save some changes");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-40 col-span-2" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !dataset) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Error Loading Dataset</h2>
        <p className="text-muted-foreground">{error || "Dataset not found"}</p>
        <Button asChild>
          <Link href="/datasets">Back to Datasets</Link>
        </Button>
      </div>
    );
  }

  // Determine columns to display
  // For manual datasets, we use the localSchema
  // For others, we try to infer from the first sample
  let displayColumns: string[] = [];
  if (localSchema?.columns) {
    displayColumns = Object.keys(localSchema.columns);
  } else if (samples.length > 0) {
    // If input is an object, use its keys. Otherwise just 'input'
    const firstInput = samples[0].input;
    if (typeof firstInput === 'object' && firstInput !== null) {
      displayColumns = Object.keys(firstInput);
    } else {
      displayColumns = ['input'];
    }

    // Always include expected_output if it exists in any sample
    if (samples.some(s => s.expected_output !== undefined && s.expected_output !== null)) {
      displayColumns.push('expected_output');
    }
  }

  const allSamples = [...samples, ...pendingAdds];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/datasets">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        {isEditing ? (
          <div className="flex-1 flex items-center gap-2">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="text-3xl font-bold h-12"
              placeholder="Dataset Name"
            />
          </div>
        ) : (
          <h1 className="text-3xl font-bold">{dataset.name}</h1>
        )}
        <Badge variant="secondary" className="capitalize">
          {dataset.source}
        </Badge>
        <div className="ml-auto flex gap-2">
          {isEditing ? (
            <>
              <Button variant="ghost" size="sm" onClick={handleCancel} disabled={saving}>
                <X className="h-4 w-4 mr-2" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Check className="h-4 w-4 mr-2" /> Save
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4 mr-2" /> Edit Details
            </Button>
          )}
        </div>
      </div>

      {hasChanges && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-2 rounded-full">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium">You have unsaved changes</p>
              <p className="text-sm text-muted-foreground">
                {pendingDeletes.size} deletions, {pendingAdds.length} additions, {Object.keys(pendingUpdates).length} updates pending.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleDiscardChanges} disabled={saving}>
              Discard
            </Button>
            <Button size="sm" onClick={handleGlobalSave} disabled={saving}>
              {saving ? "Saving..." : "Save All Changes"}
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Dataset description..."
                className="min-h-[100px]"
              />
            ) : (
              <p className="text-muted-foreground">
                {dataset.description || "No description provided."}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Samples</span>
              <span className="text-2xl font-bold">{allSamples.length - pendingDeletes.size}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Created
              </span>
              <span className="text-sm">
                {new Date(dataset.created_at).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Data Samples</CardTitle>
          <div className="flex gap-2">
            <Dialog open={isAddingColumn} onOpenChange={setIsAddingColumn}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Columns className="h-4 w-4 mr-2" /> Add Column
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Column</DialogTitle>
                  <DialogDescription>
                    Add a new column to your dataset schema.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="col-name" className="text-right">Name</Label>
                    <Input
                      id="col-name"
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      className="col-span-3"
                      placeholder="e.g. metadata_tag"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddingColumn(false)}>Cancel</Button>
                  <Button onClick={handleAddColumn} disabled={!newColumnName}>Add Column</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddingRow} onOpenChange={setIsAddingRow}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" /> Add Row
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Row</DialogTitle>
                  <DialogDescription>
                    Fill in the values for the new data sample.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {displayColumns.map(col => (
                    <div key={col} className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right capitalize">{col.replace(/_/g, ' ')}</Label>
                      <Input
                        className="col-span-3"
                        value={newRowData[col] || ""}
                        onChange={(e) => setNewRowData({ ...newRowData, [col]: e.target.value })}
                        placeholder={`Value for ${col}...`}
                      />
                    </div>
                  ))}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddingRow(false)}>Cancel</Button>
                  <Button onClick={handleAddRow}>Add Row</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {allSamples.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No samples found in this dataset.
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    {displayColumns.map(col => (
                      <TableHead key={col} className="capitalize">
                        {col.replace(/_/g, ' ')}
                      </TableHead>
                    ))}
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allSamples.map((sample) => {
                    const isDeleted = pendingDeletes.has(sample.id);
                    const isNew = sample.id.startsWith('new-');
                    const isUpdated = pendingUpdates[sample.id];

                    return (
                      <TableRow
                        key={sample.id}
                        className={`
                          ${isDeleted ? 'bg-destructive/10 opacity-60' : ''}
                          ${isNew ? 'bg-green-500/10' : ''}
                          ${isUpdated ? 'bg-blue-500/10' : ''}
                        `}
                      >
                        {displayColumns.map(col => {
                          const isEditingRow = editingRowId === sample.id;
                          let value;
                          if (col === 'expected_output') {
                            value = isEditingRow ? tempRowData.expected_output?.text || tempRowData.expected_output : (pendingUpdates[sample.id]?.expected_output || sample.expected_output);
                          } else if (typeof sample.input === 'object' && sample.input !== null) {
                            value = isEditingRow ? tempRowData.input[col] : (pendingUpdates[sample.id]?.input?.[col] || sample.input[col]);
                          } else if (col === 'input') {
                            value = isEditingRow ? tempRowData.input : (pendingUpdates[sample.id]?.input || sample.input);
                          }

                          if (isEditingRow) {
                            return (
                              <TableCell key={col}>
                                <Input
                                  value={typeof value === 'object' ? JSON.stringify(value) : (value ?? '')}
                                  onChange={(e) => {
                                    if (col === 'expected_output') {
                                      setTempRowData({
                                        ...tempRowData,
                                        expected_output: typeof sample.expected_output === 'object' ? { ...tempRowData.expected_output, text: e.target.value } : e.target.value
                                      });
                                    } else {
                                      setTempRowData({
                                        ...tempRowData,
                                        input: { ...tempRowData.input, [col]: e.target.value }
                                      });
                                    }
                                  }}
                                  className="h-8"
                                />
                              </TableCell>
                            );
                          }

                          // Handle objects/arrays for display
                          const displayValue = typeof value === 'object' && value !== null
                            ? JSON.stringify(value)
                            : String(value ?? '-');

                          return (
                            <TableCell key={col} className={`max-w-md truncate ${isDeleted ? 'line-through' : ''}`} title={displayValue}>
                              {displayValue}
                            </TableCell>
                          );
                        })}
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {editingRowId === sample.id ? (
                              <>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => handleSaveRowEdit(sample.id)}>
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setEditingRowId(null)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={`h-8 w-8 ${isUpdated ? 'text-blue-600' : 'text-muted-foreground'}`}
                                  onClick={() => startEditRow(sample)}
                                  disabled={isDeleted}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={`h-8 w-8 ${isDeleted ? 'text-primary' : 'text-muted-foreground hover:text-destructive'}`}
                                  onClick={() => handleDeleteRow(sample.id)}
                                >
                                  {isDeleted ? <Plus className="h-4 w-4 rotate-45" /> : <Trash2 className="h-4 w-4" />}
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

