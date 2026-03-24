"use client";

import { useState } from "react";
import { useDocuments, useDeleteDocument } from "@/hooks/use-documents";
import { useTemplates } from "@/hooks/use-templates";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  ExternalLink,
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

  const handleDelete = (e: React.MouseEvent, id: number, filename: string) => {
    e.preventDefault();
    e.stopPropagation();
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
        <Select
          value={statusFilter}
          onValueChange={(val) => setStatusFilter(val ?? "")}
        >
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
        <Select
          value={templateFilter}
          onValueChange={(val) => setTemplateFilter(val ?? "")}
        >
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

      {/* Document Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
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
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Filename</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Pages</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[70px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.documents.map((doc) => {
                  const isProcessing =
                    doc.status === "extracting" ||
                    doc.status === "ocr_processing" ||
                    doc.status === "classifying";

                  return (
                    <TableRow key={doc.id} className="group">
                      <TableCell>
                        <Link
                          href={`/documents/${doc.id}`}
                          className="flex items-center gap-2 font-medium text-primary hover:underline"
                        >
                          <FileText className="h-4 w-4 flex-shrink-0" />
                          <span className="max-w-[280px] truncate">
                            {doc.filename}
                          </span>
                          <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {doc.template_name || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {doc.file_size
                          ? `${(doc.file_size / 1024).toFixed(0)} KB`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {doc.page_count ?? "—"}
                      </TableCell>
                      <TableCell>
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
                          {isProcessing && (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          )}
                          {statusLabels[doc.status] || doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) =>
                            handleDelete(e, doc.id, doc.filename)
                          }
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Showing {(page - 1) * data.limit + 1}–
                {Math.min(page * data.limit, data.total)} of {data.total}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  {page} / {totalPages}
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
            </div>
          )}
        </>
      )}
    </div>
  );
}
