"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useTemplate,
  useSuggestFields,
  useAddField,
  useDeleteField,
  useUpdateField,
} from "@/hooks/use-templates";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Wand2,
  FileText,
  Table2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const fieldTypes = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "currency", label: "Currency" },
  { value: "boolean", label: "Boolean" },
  { value: "table", label: "Table" },
];

const columnTypes = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "currency", label: "Currency" },
  { value: "boolean", label: "Boolean" },
];

interface NewColumn {
  name: string;
  label: string;
  type: string;
}

export default function TemplateDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const { data: template, isLoading } = useTemplate(id);
  const suggestMutation = useSuggestFields();
  const addFieldMutation = useAddField();
  const deleteFieldMutation = useDeleteField();
  const updateFieldMutation = useUpdateField();

  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [newFieldColumns, setNewFieldColumns] = useState<NewColumn[]>([]);

  const handleAddField = () => {
    if (!newFieldName.trim() || !newFieldLabel.trim()) {
      toast.error("Field name and label are required");
      return;
    }
    if (newFieldType === "table" && newFieldColumns.length === 0) {
      toast.error("Table fields require at least one column");
      return;
    }
    // Validate column names
    if (newFieldType === "table") {
      const emptyCol = newFieldColumns.find((c) => !c.name.trim() || !c.label.trim());
      if (emptyCol) {
        toast.error("All columns must have a name and label");
        return;
      }
    }
    addFieldMutation.mutate(
      {
        templateId: id,
        field_name: newFieldName.trim().toLowerCase().replace(/\s+/g, "_"),
        field_label: newFieldLabel.trim(),
        field_type: newFieldType,
        required: false,
        ...(newFieldType === "table" ? { columns: newFieldColumns } : {}),
      },
      {
        onSuccess: () => {
          setNewFieldName("");
          setNewFieldLabel("");
          setNewFieldType("text");
          setNewFieldColumns([]);
          toast.success("Field added");
        },
        onError: () => toast.error("Failed to add field"),
      }
    );
  };

  const handleDeleteField = (fieldId: number) => {
    deleteFieldMutation.mutate(
      { templateId: id, fieldId },
      {
        onSuccess: () => toast.success("Field removed"),
        onError: () => toast.error("Failed to remove field"),
      }
    );
  };

  const handleSuggestFields = () => {
    suggestMutation.mutate(id, {
      onSuccess: () =>
        toast.success("Fields suggested by AI! Review them below."),
      onError: (err: any) =>
        toast.error(
          err?.response?.data?.detail || "Field suggestion failed"
        ),
    });
  };

  const handleAddColumn = () => {
    setNewFieldColumns([...newFieldColumns, { name: "", label: "", type: "text" }]);
  };

  const handleRemoveColumn = (index: number) => {
    setNewFieldColumns(newFieldColumns.filter((_, i) => i !== index));
  };

  const handleColumnChange = (index: number, key: keyof NewColumn, value: string) => {
    setNewFieldColumns(
      newFieldColumns.map((col, i) => (i === index ? { ...col, [key]: value } : col))
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!template) {
    return <p>Template not found</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/templates">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{template.name}</h1>
            {template.description && (
              <p className="text-muted-foreground">{template.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">
            <FileText className="mr-1 h-3 w-3" />
            {template.document_count} documents
          </Badge>
          {template.example_file && (
            <Button
              variant="outline"
              onClick={handleSuggestFields}
              disabled={suggestMutation.isPending}
            >
              {suggestMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              Re-suggest Fields
            </Button>
          )}
        </div>
      </div>

      {/* Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Extraction Fields</CardTitle>
          <CardDescription>
            Define which fields should be extracted from documents using this
            template
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {template.fields.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">
              No fields yet. Add fields manually or use AI suggestion.
            </p>
          ) : (
            <div className="space-y-2">
              {template.fields.map((field) => (
                <div
                  key={field.id}
                  className="rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="font-medium">{field.field_label}</p>
                      <p className="text-xs text-muted-foreground">
                        {field.field_name}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {field.field_type === "table" && <Table2 className="mr-1 h-3 w-3" />}
                      {field.field_type}
                    </Badge>
                    {field.required && <Badge variant="default">Required</Badge>}
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">Req</span>
                      <Switch
                        checked={field.required}
                        onCheckedChange={(checked) =>
                          updateFieldMutation.mutate({
                            templateId: id,
                            fieldId: field.id,
                            required: checked,
                          })
                        }
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteField(field.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  {/* Show columns for table fields */}
                  {field.field_type === "table" && field.columns && field.columns.length > 0 && (
                    <div className="mt-2 ml-4 flex flex-wrap gap-1">
                      {field.columns.map((col) => (
                        <Badge key={col.name} variant="outline" className="text-xs">
                          {col.label} ({col.type})
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Field Form */}
          <div className="space-y-3 rounded-lg border border-dashed p-3">
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium">Field Name</label>
                <Input
                  placeholder="e.g., invoice_number"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium">Label</label>
                <Input
                  placeholder="e.g., Invoice Number"
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                />
              </div>
              <div className="w-32 space-y-1">
                <label className="text-xs font-medium">Type</label>
                <Select
                  value={newFieldType}
                  onValueChange={(val) => {
                    setNewFieldType(val ?? "text");
                    if (val !== "table") setNewFieldColumns([]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddField} disabled={addFieldMutation.isPending}>
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </div>

            {/* Column editor for table type */}
            {newFieldType === "table" && (
              <div className="ml-4 space-y-2 rounded border bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Table Columns</p>
                  <Button variant="outline" size="sm" onClick={handleAddColumn}>
                    <Plus className="mr-1 h-3 w-3" />
                    Add Column
                  </Button>
                </div>
                {newFieldColumns.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Add at least one column to define the table structure.
                  </p>
                )}
                {newFieldColumns.map((col, idx) => (
                  <div key={idx} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs text-muted-foreground">Column Name</label>
                      <Input
                        placeholder="e.g., cnpj"
                        value={col.name}
                        onChange={(e) => handleColumnChange(idx, "name", e.target.value)}
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-xs text-muted-foreground">Column Label</label>
                      <Input
                        placeholder="e.g., CNPJ"
                        value={col.label}
                        onChange={(e) => handleColumnChange(idx, "label", e.target.value)}
                      />
                    </div>
                    <div className="w-28 space-y-1">
                      <label className="text-xs text-muted-foreground">Type</label>
                      <Select
                        value={col.type}
                        onValueChange={(val) => handleColumnChange(idx, "type", val ?? "text")}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {columnTypes.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveColumn(idx)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
