"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Column {
  name: string;
  type: "text" | "number";
  required: boolean;
}

interface Row {
  id: string;
  data: Record<string, any>;
}

interface DatasetBuilderProps {
  initialColumns?: Column[];
  initialRows?: Row[];
  onChange?: (columns: Column[], rows: Row[]) => void;
}

export function DatasetBuilder({ initialColumns = [], initialRows = [], onChange }: DatasetBuilderProps) {
  const [columns, setColumns] = useState<Column[]>(initialColumns.length > 0 ? initialColumns : [
    { name: "input", type: "text", required: true },
    { name: "expected_output", type: "text", required: false }
  ]);
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [editingColumn, setEditingColumn] = useState<number | null>(null);
  const [newColumnName, setNewColumnName] = useState("");
  const [editingCell, setEditingCell] = useState<{ rowId: string; colName: string } | null>(null);
  const [cellValue, setCellValue] = useState("");

  useEffect(() => {
    if (onChange) {
      onChange(columns, rows);
    }
  }, [columns, rows]);

  const addColumn = () => {
    if (!newColumnName.trim()) return;
    
    // Check for duplicate names
    if (columns.some(col => col.name === newColumnName.trim())) {
      alert("Column name already exists");
      return;
    }

    setColumns([...columns, { name: newColumnName.trim(), type: "text", required: false }]);
    setNewColumnName("");
  };

  const removeColumn = (index: number) => {
    if (columns[index].required) {
      alert("Cannot remove required columns");
      return;
    }
    
    const colName = columns[index].name;
    setColumns(columns.filter((_, i) => i !== index));
    
    // Remove data from all rows for this column
    setRows(rows.map(row => ({
      ...row,
      data: Object.fromEntries(
        Object.entries(row.data).filter(([key]) => key !== colName)
      )
    })));
  };

  const renameColumn = (index: number, newName: string) => {
    if (!newName.trim()) return;
    
    // Check for duplicate names
    if (columns.some((col, i) => i !== index && col.name === newName.trim())) {
      alert("Column name already exists");
      return;
    }

    const oldName = columns[index].name;
    const updatedColumns = [...columns];
    updatedColumns[index] = { ...updatedColumns[index], name: newName.trim() };
    setColumns(updatedColumns);

    // Update all row data with new column name
    setRows(rows.map(row => {
      const newData = { ...row.data };
      if (oldName in newData) {
        newData[newName.trim()] = newData[oldName];
        delete newData[oldName];
      }
      return { ...row, data: newData };
    }));

    setEditingColumn(null);
  };

  const addRow = () => {
    const newRow: Row = {
      id: `row-${Date.now()}-${Math.random()}`,
      data: {}
    };
    
    // Initialize with empty values for all columns
    columns.forEach(col => {
      newRow.data[col.name] = "";
    });
    
    setRows([...rows, newRow]);
  };

  const removeRow = (rowId: string) => {
    setRows(rows.filter(row => row.id !== rowId));
  };

  const updateCell = (rowId: string, colName: string, value: any) => {
    setRows(rows.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          data: { ...row.data, [colName]: value }
        };
      }
      return row;
    }));
  };

  const startEditingCell = (rowId: string, colName: string) => {
    const row = rows.find(r => r.id === rowId);
    if (row) {
      setCellValue(row.data[colName] || "");
      setEditingCell({ rowId, colName });
    }
  };

  const finishEditingCell = () => {
    if (editingCell) {
      updateCell(editingCell.rowId, editingCell.colName, cellValue);
      setEditingCell(null);
      setCellValue("");
    }
  };

  const cancelEditingCell = () => {
    setEditingCell(null);
    setCellValue("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dataset Builder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Column Management */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Columns</h3>
          <div className="flex gap-2 flex-wrap">
            {columns.map((col, index) => (
              <div key={col.name} className="flex items-center gap-1 bg-muted px-3 py-1 rounded-md">
                {editingColumn === index ? (
                  <>
                    <Input
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") renameColumn(index, newColumnName);
                        if (e.key === "Escape") setEditingColumn(null);
                      }}
                      className="h-6 w-32"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => renameColumn(index, newColumnName)}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => setEditingColumn(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-sm">{col.name}</span>
                    {col.required && <span className="text-xs text-red-500">*</span>}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        setNewColumnName(col.name);
                        setEditingColumn(index);
                      }}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    {!col.required && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => removeColumn(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Input
                placeholder="New column name"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addColumn()}
                className="h-8 w-40"
              />
              <Button size="sm" onClick={addColumn} className="h-8">
                <Plus className="h-4 w-4 mr-1" /> Add Column
              </Button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="border rounded-md">
          <div className="max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map(col => (
                    <TableHead key={col.name}>
                      {col.name}
                      {col.required && <span className="text-red-500 ml-1">*</span>}
                    </TableHead>
                  ))}
                  <TableHead className="w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground">
                      No rows yet. Click "Add Row" to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map(row => (
                    <TableRow key={row.id}>
                      {columns.map(col => (
                        <TableCell key={col.name} className="p-2">
                          {editingCell?.rowId === row.id && editingCell?.colName === col.name ? (
                            <div className="flex gap-1">
                              <Input
                                value={cellValue}
                                onChange={(e) => setCellValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") finishEditingCell();
                                  if (e.key === "Escape") cancelEditingCell();
                                }}
                                className="h-8"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={finishEditingCell}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={cancelEditingCell}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div
                              className="cursor-pointer hover:bg-muted p-2 rounded min-h-[32px]"
                              onClick={() => startEditingCell(row.id, col.name)}
                            >
                              {row.data[col.name] || <span className="text-muted-foreground italic">Click to edit</span>}
                            </div>
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="p-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeRow(row.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <Button onClick={addRow} className="w-full">
          <Plus className="h-4 w-4 mr-2" /> Add Row
        </Button>

        <div className="text-sm text-muted-foreground">
          {rows.length} row{rows.length !== 1 ? "s" : ""} • {columns.length} column{columns.length !== 1 ? "s" : ""}
        </div>
      </CardContent>
    </Card>
  );
}

