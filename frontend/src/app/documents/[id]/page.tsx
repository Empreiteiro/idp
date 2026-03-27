"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  useDocument,
  useReprocessDocument,
  useUpdateExtraction,
  useApproveExtraction,
} from "@/hooks/use-documents";
import { useTemplate, useTemplates } from "@/hooks/use-templates";
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
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  CheckCircle,
  RefreshCw,
  Loader2,
  AlertTriangle,
  FileText,
  Save,
  FolderOpen,
  Info,
  Plus,
  Trash2,
  Download,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import api from "@/lib/api";
import type { FieldValue, TableRowValue } from "@/lib/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  if (confidence >= 0.9)
    return (
      <Badge className="rounded-full bg-green-100 text-green-700 hover:bg-green-100">
        {pct}%
      </Badge>
    );
  if (confidence >= 0.7)
    return (
      <Badge className="rounded-full bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
        {pct}%
      </Badge>
    );
  return (
    <Badge className="rounded-full bg-red-100 text-red-700 hover:bg-red-100">{pct}%</Badge>
  );
}

const statusLabels: Record<string, string> = {
  completed: "Completed",
  failed: "Failed",
  review: "Needs Review",
  uploaded: "Uploaded",
  ocr_processing: "OCR Processing",
  ocr_complete: "OCR Complete",
  classifying: "Classifying",
  extracting: "Extracting",
};

export default function DocumentDetailPage() {
  const params = useParams();
  const docId = Number(params.id);
  const queryClient = useQueryClient();
  const { data: doc, isLoading } = useDocument(docId);
  const { data: template } = useTemplate(doc?.template_id ?? null);
  const { data: templates } = useTemplates();
  const reprocessMutation = useReprocessDocument();
  const updateMutation = useUpdateExtraction();
  const approveMutation = useApproveExtraction();

  const [editedData, setEditedData] = useState<Record<
    string,
    FieldValue
  > | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const assignTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const formData = new FormData();
      formData.append("template_id", String(templateId));
      formData.append("auto_process", "true");
      const { data } = await api.put(
        `/api/documents/${docId}/assign-template`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document", docId] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Template assigned and processing started");
    },
    onError: () => toast.error("Failed to assign template"),
  });

  const extractionData =
    editedData ?? doc?.extraction?.extracted_data ?? null;

  const handleFieldChange = (fieldName: string, newValue: string) => {
    if (!extractionData) return;
    const updated = {
      ...extractionData,
      [fieldName]: {
        ...extractionData[fieldName],
        value: newValue,
        corrected: newValue !== extractionData[fieldName]?.original_value,
      },
    };
    setEditedData(updated);
  };

  const handleTableCellChange = (
    fieldName: string,
    rowIndex: number,
    colName: string,
    newValue: string
  ) => {
    if (!extractionData) return;
    const currentField = extractionData[fieldName];
    const rows = Array.isArray(currentField?.value)
      ? [...(currentField.value as TableRowValue[])]
      : [];
    rows[rowIndex] = { ...rows[rowIndex], [colName]: newValue };
    const updated = {
      ...extractionData,
      [fieldName]: {
        ...currentField,
        value: rows,
        corrected: true,
      },
    };
    setEditedData(updated);
  };

  const handleAddTableRow = (fieldName: string) => {
    if (!extractionData) return;
    const currentField = extractionData[fieldName];
    const rows = Array.isArray(currentField?.value)
      ? [...(currentField.value as TableRowValue[])]
      : [];
    const templateField = template?.fields.find((f) => f.field_name === fieldName);
    const emptyRow: TableRowValue = {};
    templateField?.columns?.forEach((col) => {
      emptyRow[col.name] = "";
    });
    rows.push(emptyRow);
    setEditedData({
      ...extractionData,
      [fieldName]: { ...currentField, value: rows, corrected: true },
    });
  };

  const handleDeleteTableRow = (fieldName: string, rowIndex: number) => {
    if (!extractionData) return;
    const currentField = extractionData[fieldName];
    const rows = Array.isArray(currentField?.value)
      ? (currentField.value as TableRowValue[]).filter((_, i) => i !== rowIndex)
      : [];
    setEditedData({
      ...extractionData,
      [fieldName]: { ...currentField, value: rows, corrected: true },
    });
  };

  const handleSave = () => {
    if (!editedData) return;
    updateMutation.mutate(
      { docId, extracted_data: editedData },
      {
        onSuccess: () => {
          toast.success("Changes saved");
          setEditedData(null);
        },
        onError: () => toast.error("Failed to save"),
      }
    );
  };

  const handleApprove = () => {
    approveMutation.mutate(docId, {
      onSuccess: () => toast.success("Extraction approved!"),
      onError: () => toast.error("Failed to approve"),
    });
  };

  const handleReprocess = () => {
    reprocessMutation.mutate(docId, {
      onSuccess: () => {
        toast.success("Reprocessing started");
        setEditedData(null);
      },
      onError: () => toast.error("Reprocessing failed"),
    });
  };

  const handleAssignTemplate = () => {
    if (!selectedTemplateId) return;
    assignTemplateMutation.mutate(Number(selectedTemplateId));
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[600px]" />
          <Skeleton className="h-[600px]" />
        </div>
      </div>
    );
  }

  if (!doc) return <p>Document not found</p>;

  const fileUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/documents/${doc.id}/file`;
  const isProcessing = ["ocr_processing", "classifying", "extracting"].includes(
    doc.status
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/documents">
          <Button variant="ghost" size="icon" className="rounded-xl">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <PageHeader
            title={doc.filename}
            description=""
            actions={
              <div className="flex items-center gap-2">
                {doc.template_name && (
                  <Badge variant="outline" className="rounded-full gap-1">
                    <FolderOpen className="h-3 w-3" />
                    {doc.template_name}
                  </Badge>
                )}
                <Badge
                  className="rounded-full"
                  variant={
                    doc.status === "completed"
                      ? "default"
                      : doc.status === "failed"
                        ? "destructive"
                        : doc.status === "review"
                          ? "secondary"
                          : "outline"
                  }
                >
                  {isProcessing && (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  )}
                  {statusLabels[doc.status] || doc.status}
                </Badge>
                {doc.page_count && (
                  <span className="text-xs text-muted-foreground">{doc.page_count} page(s)</span>
                )}
                {doc.file_size && (
                  <span className="text-xs text-muted-foreground">
                    {(doc.file_size / 1024).toFixed(0)} KB
                  </span>
                )}
                <a
                  href={`${fileUrl}?download=true`}
                  download
                >
                  <Button variant="outline" className="rounded-xl">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </a>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={handleReprocess}
                  disabled={reprocessMutation.isPending || isProcessing}
                >
                  {reprocessMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Reprocess
                </Button>
              </div>
            }
          />
        </div>
      </div>

      {/* Error Message */}
      {doc.error_message && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium">Attention</p>
            <p>{doc.error_message}</p>
          </div>
        </div>
      )}

      {/* Template Assignment for review/unclassified docs */}
      {(doc.status === "review" || (!doc.template_id && doc.status !== "failed")) && (
        <Card className="synapse-shadow border-border/50 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-500" />
              Assign Template
            </CardTitle>
            <CardDescription>
              This document needs a template. Select one to proceed with
              extraction.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Select
                value={selectedTemplateId}
                onValueChange={(val) => setSelectedTemplateId(val ?? "")}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name} ({t.field_count} fields)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="rounded-xl"
                onClick={handleAssignTemplate}
                disabled={
                  !selectedTemplateId || assignTemplateMutation.isPending
                }
              >
                {assignTemplateMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FolderOpen className="mr-2 h-4 w-4" />
                )}
                Assign & Process
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Split View */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Document Viewer */}
        <Card className="h-fit synapse-shadow border-border/50 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Document Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {doc.file_type === "pdf" ? (
              <iframe
                src={fileUrl}
                className="h-[700px] w-full rounded border"
                title="Document preview"
              />
            ) : (
              <img
                src={fileUrl}
                alt={doc.filename}
                className="max-h-[700px] w-full rounded border object-contain"
              />
            )}
          </CardContent>
        </Card>

        {/* Right: Extraction Panel */}
        <Card className="h-fit synapse-shadow border-border/50 rounded-2xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Extracted Data</CardTitle>
              {doc.extraction?.is_reviewed && (
                <Badge className="rounded-full bg-green-100 text-green-700">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Reviewed
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!extractionData ? (
              <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
                <FileText className="h-10 w-10" />
                <p className="text-sm">
                  {isProcessing
                    ? "Processing document..."
                    : doc.status === "completed"
                      ? "No extraction data available"
                      : doc.status === "failed"
                        ? "Processing failed"
                        : doc.status === "review"
                          ? "Assign a template to extract data"
                          : "Waiting for processing"}
                </p>
                {isProcessing && (
                  <Loader2 className="h-6 w-6 animate-spin" />
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(extractionData).map(([fieldName, field]) => {
                  const templateField = template?.fields.find(
                    (f) => f.field_name === fieldName
                  );
                  const isTable =
                    templateField?.field_type === "table" &&
                    Array.isArray(field.value);
                  const fieldLabel =
                    templateField?.field_label ||
                    fieldName
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase());

                  return (
                    <div key={fieldName} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-muted-foreground">
                          {fieldLabel}
                          {isTable && (
                            <span className="ml-1 text-[10px]">
                              ({(field.value as TableRowValue[]).length} rows)
                            </span>
                          )}
                        </label>
                        <div className="flex items-center gap-1">
                          {field.corrected && (
                            <Badge
                              variant="outline"
                              className="rounded-full text-[10px] px-1"
                            >
                              Edited
                            </Badge>
                          )}
                          <ConfidenceBadge confidence={field.confidence} />
                        </div>
                      </div>

                      {isTable && templateField?.columns ? (
                        <div className="space-y-2">
                          <div className="overflow-x-auto rounded border">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b bg-muted/50">
                                  {templateField.columns.map((col) => (
                                    <th
                                      key={col.name}
                                      className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground"
                                    >
                                      {col.label}
                                    </th>
                                  ))}
                                  <th className="w-8 px-1" />
                                </tr>
                              </thead>
                              <tbody>
                                {(field.value as TableRowValue[]).map(
                                  (row, rowIdx) => (
                                    <tr
                                      key={rowIdx}
                                      className="border-b last:border-0"
                                    >
                                      {templateField.columns!.map((col) => (
                                        <td key={col.name} className="px-1 py-1">
                                          <Input
                                            className="h-7 text-xs"
                                            value={
                                              row[col.name] != null
                                                ? String(row[col.name])
                                                : ""
                                            }
                                            onChange={(e) =>
                                              handleTableCellChange(
                                                fieldName,
                                                rowIdx,
                                                col.name,
                                                e.target.value
                                              )
                                            }
                                          />
                                        </td>
                                      ))}
                                      <td className="px-1 py-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() =>
                                            handleDeleteTableRow(
                                              fieldName,
                                              rowIdx
                                            )
                                          }
                                        >
                                          <Trash2 className="h-3 w-3 text-red-500" />
                                        </Button>
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs rounded-xl"
                            onClick={() => handleAddTableRow(fieldName)}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Add Row
                          </Button>
                        </div>
                      ) : (
                        <Input
                          value={
                            field.value != null ? String(field.value) : ""
                          }
                          onChange={(e) =>
                            handleFieldChange(fieldName, e.target.value)
                          }
                          className={
                            field.corrected
                              ? "border-blue-300 bg-blue-50"
                              : field.confidence < 0.7
                                ? "border-red-200 bg-red-50"
                                : ""
                          }
                        />
                      )}
                    </div>
                  );
                })}

                <Separator className="my-4" />

                <div className="flex gap-2">
                  {editedData && (
                    <Button
                      variant="outline"
                      className="flex-1 rounded-xl"
                      onClick={handleSave}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Changes
                    </Button>
                  )}
                  {!doc.extraction?.is_reviewed && (
                    <Button
                      className="flex-1 rounded-xl"
                      onClick={handleApprove}
                      disabled={approveMutation.isPending}
                    >
                      {approveMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      Approve
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
