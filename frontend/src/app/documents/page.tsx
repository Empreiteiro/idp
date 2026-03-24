"use client";

import { useState } from "react";
import { useDocuments, useDeleteDocument } from "@/hooks/use-documents";
import { useTemplates } from "@/hooks/use-templates";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Plus,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const statusLabels: Record<string, string> = {
  completed: "Completed",
  failed: "Failed",
  review: "Review",
  uploaded: "Uploaded",
  ocr_processing: "OCR Processing",
  classifying: "Classifying",
  extracting: "Extracting",
};

export default function DocumentsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [templateFilter, setTemplateFilter] = useState<string>("");

  const { data, isLoading } = useDocuments({
    page,
    limit: 20,
    status: statusFilter || undefined,
    template_id: templateFilter ? Number(templateFilter) : undefined,
  });
  const { data: templates } = useTemplates();
  const deleteMutation = useDeleteDocument();

  const handleDelete = (id: number, filename: string) => {
    if (confirm(`Delete "${filename}"?`)) {
      deleteMutation.mutate(id, {
        onSuccess: () => toast.success("Document deleted"),
        onError: () => toast.error("Failed to delete"),
      });
    }
  };

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-muted-foreground">
            {data?.total ?? 0} documents total
          </p>
        </div>
        <Link href="/documents/upload">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val ?? "")}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={templateFilter} onValueChange={(val) => setTemplateFilter(val ?? "")}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All templates" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All templates</SelectItem>
            {templates?.map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(statusFilter || templateFilter) && (
          <Button
            variant="ghost"
            onClick={() => {
              setStatusFilter("");
              setTemplateFilter("");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Document List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !data?.documents.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No documents found</p>
            <Link href="/documents/upload">
              <Button>Upload Document</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {data.documents.map((doc) => (
              <div
                key={doc.id}
                className="group flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted"
              >
                <Link
                  href={`/documents/${doc.id}`}
                  className="flex flex-1 items-center gap-4"
                >
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">{doc.filename}</p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>
                        {doc.file_size
                          ? `${(doc.file_size / 1024).toFixed(0)} KB`
                          : ""}
                      </span>
                      {doc.template_name && (
                        <span>| {doc.template_name}</span>
                      )}
                      <span>
                        | {new Date(doc.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <Badge
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
                    {doc.status === "extracting" ||
                    doc.status === "ocr_processing" ||
                    doc.status === "classifying" ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : null}
                    {statusLabels[doc.status] || doc.status}
                  </Badge>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-2 opacity-0 group-hover:opacity-100"
                  onClick={() => handleDelete(doc.id, doc.filename)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
