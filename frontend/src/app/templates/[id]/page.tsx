"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useDropzone } from "react-dropzone";
import {
  useTemplate,
  useSuggestFields,
  useAddField,
  useDeleteField,
  useUpdateField,
  useAddExampleFiles,
  useRemoveExampleFile,
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
import { PageHeader } from "@/components/layout/page-header";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Wand2,
  FileText,
  Table2,
  Upload,
  X,
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
  const addFilesMutation = useAddExampleFiles();
  const removeFileMutation = useRemoveExampleFile();

  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [newFieldColumns, setNewFieldColumns] = useState<NewColumn[]>([]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) return;
      const formData = new FormData();
      acceptedFiles.forEach((f) => formData.append("files", f));
      addFilesMutation.mutate(
        { templateId: id, formData },
        {
          onSuccess: () =>
            toast.success(
              `${acceptedFiles.length} file${acceptedFiles.length > 1 ? "s" : ""} added`
            ),
          onError: () => toast.error("Failed to add files"),
        }
      );
    },
    [id, addFilesMutation]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp"],
    },
  });

  const handleAddField = () => {
    if (!newFieldName.trim() || !newFieldLabel.trim()) {
      toast.error("Field name and label are required");
      return;
    }
    if (newFieldType === "table" && newFieldColumns.length === 0) {
      toast.error("Table fields require at least one column");
      return;
    }
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

  const handleRemoveFile = (index: number) => {
    removeFileMutation.mutate(
      { templateId: id, fileIndex: index },
      {
        onSuccess: () => toast.success("File removed"),
        onError: () => toast.error("Failed to remove file"),
      }
    );
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

  const exampleFiles = template.example_files || [];

  return (
    <div className="space-y-8">
      <PageHeader
        title={template.name}
        description={template.description || undefined}
        actions={
          <div className="flex items-center gap-3">
            <Link href="/templates">
              <Button variant="ghost" size="icon" className="rounded-xl">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Badge variant="outline" className="rounded-full">
              <FileText className="mr-1 h-3 w-3" />
              {template.document_count} documents
            </Badge>
            {exampleFiles.length > 0 && (
              <Button
                variant="outline"
                className="rounded-xl"
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
        }
      />

      {/* Example Documents */}
      <Card className="synapse-shadow border-border/50 rounded-2xl">
        <CardHeader>
          <CardTitle>Example Documents</CardTitle>
          <CardDescription>
            {exampleFiles.length > 1
              ? `${exampleFiles.length} example documents — AI compares all to detect field differences`
              : "Upload example documents for AI field suggestion"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {exampleFiles.length > 0 && (
            <div className="space-y-2">
              {exampleFiles.map((filePath, idx) => {
                const fileName = filePath.split("/").pop() || filePath;
                return (
                  <div
                    key={`${filePath}-${idx}`}
                    className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-green-600" />
                    <span className="flex-1 text-sm font-medium truncate">
                      {fileName}
                    </span>
                    <Badge variant="secondary" className="rounded-full text-xs">
                      Doc {idx + 1}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-xl"
                      onClick={() => handleRemoveFile(idx)}
                      disabled={removeFileMutation.isPending}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <div
            {...getRootProps()}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            {addFilesMutation.isPending ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="h-6 w-6 text-muted-foreground" />
            )}
            <p className="text-sm text-muted-foreground">
              Drop files here to add more examples
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Fields */}
      <Card className="synapse-shadow border-border/50 rounded-2xl">
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
                    <Badge variant="secondary" className="rounded-full">
                      {field.field_type === "table" && <Table2 className="mr-1 h-3 w-3" />}
                      {field.field_type}
                    </Badge>
                    {field.required && <Badge variant="default" className="rounded-full">Required</Badge>}
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
                      className="rounded-xl"
                      onClick={() => handleDeleteField(field.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  {/* Show columns for table fields */}
                  {field.field_type === "table" && field.columns && field.columns.length > 0 && (
                    <div className="mt-2 ml-4 flex flex-wrap gap-1">
                      {field.columns.map((col) => (
                        <Badge key={col.name} variant="outline" className="text-xs rounded-full">
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
              <Button className="rounded-xl" onClick={handleAddField} disabled={addFieldMutation.isPending}>
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </div>

            {/* Column editor for table type */}
            {newFieldType === "table" && (
              <div className="ml-4 space-y-2 rounded border bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Table Columns</p>
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={handleAddColumn}>
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
                      className="rounded-xl"
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
