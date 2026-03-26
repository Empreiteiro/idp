"use client";

import { useState } from "react";
import { useDashboardStats, useRecentDocuments } from "@/hooks/use-dashboard";
import { useDataSummary } from "@/hooks/use-data-tables";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  FileText,
  FolderOpen,
  CheckCircle,
  Clock,
  Loader2,
  Upload,
  ArrowRight,
  Table2,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { StatusDot } from "@/components/layout/status-dot";
import { FolderCard } from "@/components/layout/folder-card";
import { ViewToggle } from "@/components/layout/view-toggle";

const statusLabels: Record<string, string> = {
  completed: "Completed",
  failed: "Failed",
  review: "Review",
  uploaded: "Uploaded",
  ocr_processing: "OCR Processing",
  ocr_complete: "OCR Complete",
  classifying: "Classifying",
  extracting: "Extracting",
};

export default function DashboardPage() {
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recent, isLoading: recentLoading } = useRecentDocuments(8);
  const { data: dataSummary } = useDataSummary();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Overview of your document processing"
        actions={
          <>
            <Link href="/templates/new">
              <Button variant="outline" size="sm" className="rounded-xl">
                <Plus className="mr-1.5 h-4 w-4" />
                New Template
              </Button>
            </Link>
            <Link href="/documents/upload">
              <Button size="sm" className="rounded-xl">
                <Upload className="mr-1.5 h-4 w-4" />
                Upload
              </Button>
            </Link>
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Card className="synapse-shadow border-border/50 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Documents
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <FileText className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-bold tracking-tight">
                {stats?.total_documents ?? 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="synapse-shadow border-border/50 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Templates
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
              <FolderOpen className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-bold tracking-tight">
                {stats?.total_templates ?? 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="synapse-shadow border-border/50 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Review
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-500/10">
              <Clock className="h-4 w-4 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-bold tracking-tight text-yellow-600 dark:text-yellow-400">
                {stats?.pending_review ?? 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="synapse-shadow border-border/50 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reviewed
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-bold tracking-tight text-green-600 dark:text-green-400">
                {stats?.reviewed ?? 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Templates as Folder Cards */}
      {dataSummary?.templates && dataSummary.templates.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Recent {Math.min(dataSummary.templates.length, 4)}
            </h2>
            <Link href="/data">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View all
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {dataSummary.templates.slice(0, 4).map((t) => (
              <FolderCard
                key={t.template_id}
                title={t.template_name}
                subtitle={`${t.extraction_count} records · ${t.field_count} fields`}
                href={`/data/${t.template_id}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Status Breakdown */}
      {stats?.documents_by_status &&
        Object.keys(stats.documents_by_status).length > 0 && (
          <Card className="synapse-shadow border-border/50 rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Documents by Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.documents_by_status).map(
                  ([status, count]) => (
                    <Link
                      key={status}
                      href={`/documents?status=${status}`}
                      className="flex items-center gap-2 rounded-full border border-border/60 px-3.5 py-1.5 text-sm transition-colors hover:bg-muted"
                    >
                      <StatusDot status={status} />
                      <span className="font-medium">
                        {statusLabels[status] || status}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {count}
                      </span>
                    </Link>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Recent Documents with List/Grid toggle */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold">Recent Documents</h2>
            <ViewToggle value={viewMode} onChange={setViewMode} />
          </div>
          <Link href="/documents">
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              View all
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
        {recentLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : !recent?.length ? (
          <Card className="synapse-shadow border-border/50 rounded-2xl">
            <CardContent className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <FileText className="h-10 w-10" />
              <p>No documents yet</p>
              <Link
                href="/documents/upload"
                className="text-sm text-primary hover:underline"
              >
                Upload your first document
              </Link>
            </CardContent>
          </Card>
        ) : viewMode === "list" ? (
          <Card className="synapse-shadow border-border/50 rounded-2xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((doc) => (
                  <TableRow key={doc.id} className="group hover:bg-muted/30">
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
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {doc.template_name || "---"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          doc.status === "completed"
                            ? "default"
                            : doc.status === "failed"
                              ? "destructive"
                              : "secondary"
                        }
                        className="text-[11px] rounded-full"
                      >
                        {doc.status === "extracting" ||
                        doc.status === "ocr_processing" ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : null}
                        {statusLabels[doc.status] || doc.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(doc.created_at).toLocaleDateString("en-US", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {recent.map((doc) => (
              <Link
                key={doc.id}
                href={`/documents/${doc.id}`}
                className="group flex flex-col rounded-2xl bg-card p-5 synapse-shadow border border-border/50 hover:synapse-shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <StatusDot status={doc.status} />
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Data Summary */}
        <Card className="synapse-shadow border-border/50 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">
                Extracted Data
              </CardTitle>
              <CardDescription>Data tables by template</CardDescription>
            </div>
            <Link href="/data">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View all
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {!dataSummary?.templates.length ? (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <Table2 className="h-10 w-10" />
                <p>No extracted data yet</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {dataSummary.templates.map((t) => (
                  <Link
                    key={t.template_id}
                    href={`/data/${t.template_id}`}
                    className="flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/5">
                        <Table2 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {t.template_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.field_count} fields
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="rounded-full">
                        {t.extraction_count} records
                      </Badge>
                      {t.pending_count > 0 && (
                        <Badge
                          variant="outline"
                          className="text-yellow-600 border-yellow-200 rounded-full"
                        >
                          {t.pending_count} pending
                        </Badge>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
