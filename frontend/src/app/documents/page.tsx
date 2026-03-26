"use client";

import { useState, useEffect } from "react";
import { useDocuments, useDeleteDocument } from "@/hooks/use-documents";
import { useTemplates } from "@/hooks/use-templates";
import { useRecentDocuments } from "@/hooks/use-dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
  Folder,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { ViewToggle } from "@/components/layout/view-toggle";
import { StatusDot } from "@/components/layout/status-dot";

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
  const pathname = usePathname();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [templateFilter, setTemplateFilter] = useState<string>("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Read status from URL query params (from sidebar tags)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlStatus = params.get("status");
    if (urlStatus) {
      setStatusFilter(urlStatus);
    }
  }, [pathname]);

  const { data, isLoading } = useDocuments({
    page,
    limit: 20,
    status: statusFilter || undefined,
    template_id: templateFilter ? Number(templateFilter) : undefined,
  });
  const { data: templates } = useTemplates();
  const { data: recentDocs } = useRecentDocuments(4);
  const deleteMutation = useDeleteDocument();

  const handleDelete = (
    e: React.MouseEvent,
    id: number,
    filename: string
  ) => {
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
      <PageHeader
        title="Documents"
        description={`${data?.total ?? 0} documents total`}
        titleExtra={<ViewToggle value={viewMode} onChange={setViewMode} />}
        actions={
          <Link href="/documents/upload">
            <Button className="rounded-xl">
              <Plus className="mr-1.5 h-4 w-4" />
              Upload Document
            </Button>
          </Link>
        }
      />

      {/* Recent Documents as Folder Cards */}
      {recentDocs && recentDocs.length > 0 && !statusFilter && !templateFilter && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            Recent {recentDocs.length}
          </h2>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {recentDocs.map((doc) => (
              <Link
                key={doc.id}
                href={`/documents/${doc.id}`}
                className="group flex flex-col items-center justify-center gap-3 rounded-2xl bg-card p-5 synapse-shadow border border-border/50 hover:synapse-shadow-md transition-all duration-200"
              >
                <div className="flex h-14 w-18 items-center justify-center">
                  <Folder className="h-12 w-12 text-blue-400 fill-blue-100 dark:fill-blue-900/30 group-hover:scale-105 transition-transform" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-card-foreground truncate max-w-[160px]">
                    {doc.filename}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {doc.template_name || "Unclassified"} · {statusLabels[doc.status] || doc.status}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Filters + View Toggle */}
      <div className="flex items-center gap-3">
        <div className="flex gap-3">
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(!val || val === "all" ? "" : val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48 rounded-xl">
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
            onValueChange={(val) => {
              setTemplateFilter(!val || val === "all" ? "" : val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48 rounded-xl">
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
              className="rounded-xl"
              onClick={() => {
                setStatusFilter("");
                setTemplateFilter("");
                setPage(1);
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Document List/Grid */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : !data?.documents.length ? (
        <Card className="synapse-shadow border-border/50 rounded-2xl">
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No documents found</p>
            <Link href="/documents/upload">
              <Button className="rounded-xl">Upload Document</Button>
            </Link>
          </CardContent>
        </Card>
      ) : viewMode === "list" ? (
        <>
          <Card className="synapse-shadow border-border/50 rounded-2xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-10">
                    <Checkbox />
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">
                    ID
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">
                    File name
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">
                    Template
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">
                    Date added
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">
                    Size
                  </TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.documents.map((doc) => {
                  const isProcessing =
                    doc.status === "extracting" ||
                    doc.status === "ocr_processing" ||
                    doc.status === "classifying";

                  return (
                    <TableRow
                      key={doc.id}
                      className="group hover:bg-muted/30"
                    >
                      <TableCell>
                        <Checkbox />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs font-mono">
                        {doc.id}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/documents/${doc.id}`}
                          className="flex items-center gap-2.5 font-medium hover:text-primary transition-colors"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/5 shrink-0">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span className="max-w-[280px] truncate">
                            {doc.filename}
                          </span>
                          <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {doc.template_name || "---"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StatusDot status={doc.status} />
                          <span className="text-sm">
                            {isProcessing && (
                              <Loader2 className="inline mr-1 h-3 w-3 animate-spin" />
                            )}
                            {statusLabels[doc.status] || doc.status}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(doc.created_at).toLocaleDateString("en-US", {
                          weekday: "short",
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {doc.file_size
                          ? `${(doc.file_size / 1024).toFixed(0)} KB`
                          : "---"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
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
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Showing {(page - 1) * data.limit + 1}--
                {Math.min(page * data.limit, data.total)} of {data.total}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm tabular-nums">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Grid View */
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {data.documents.map((doc) => (
            <Link
              key={doc.id}
              href={`/documents/${doc.id}`}
              className="group flex flex-col rounded-2xl bg-card p-5 synapse-shadow border border-border/50 hover:synapse-shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <StatusDot status={doc.status} className="mt-1" />
              </div>
              <p className="text-sm font-medium line-clamp-2 mb-1">
                {doc.filename}
              </p>
              <p className="text-xs text-muted-foreground">
                {doc.template_name || "Unclassified"}
              </p>
              <div className="mt-auto pt-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {new Date(doc.created_at).toLocaleDateString()}
                </span>
                <Badge
                  variant={
                    doc.status === "completed"
                      ? "default"
                      : doc.status === "failed"
                        ? "destructive"
                        : "secondary"
                  }
                  className="text-[10px] rounded-full"
                >
                  {statusLabels[doc.status] || doc.status}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
