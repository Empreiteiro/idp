"use client";

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
  FileText,
  FolderOpen,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  Upload,
  ArrowRight,
  Table2,
  Plus,
} from "lucide-react";
import Link from "next/link";

const statusColors: Record<string, string> = {
  completed: "bg-green-500",
  failed: "bg-red-500",
  review: "bg-yellow-500",
  uploaded: "bg-blue-500",
  ocr_processing: "bg-blue-400",
  ocr_complete: "bg-blue-300",
  classifying: "bg-purple-400",
  extracting: "bg-indigo-400",
};

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
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recent, isLoading: recentLoading } = useRecentDocuments(8);
  const { data: dataSummary } = useDataSummary();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your document processing
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/templates/new">
            <Button variant="outline" size="sm">
              <Plus className="mr-1 h-4 w-4" />
              New Template
            </Button>
          </Link>
          <Link href="/documents/upload">
            <Button size="sm">
              <Upload className="mr-1 h-4 w-4" />
              Upload
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Documents
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.total_documents ?? 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Templates</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.total_templates ?? 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Review
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-yellow-600">
                {stats?.pending_review ?? 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Reviewed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-green-600">
                {stats?.reviewed ?? 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      {stats?.documents_by_status &&
        Object.keys(stats.documents_by_status).length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Documents by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {Object.entries(stats.documents_by_status).map(
                  ([status, count]) => (
                    <Link
                      key={status}
                      href={`/documents?status=${status}`}
                      className="flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors hover:bg-muted"
                    >
                      <div
                        className={`h-2.5 w-2.5 rounded-full ${statusColors[status] || "bg-gray-400"}`}
                      />
                      <span className="text-sm font-medium">
                        {statusLabels[status] || status}
                      </span>
                      <Badge variant="secondary">{count}</Badge>
                    </Link>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Documents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm">Recent Documents</CardTitle>
              <CardDescription>Latest processed documents</CardDescription>
            </div>
            <Link href="/documents">
              <Button variant="ghost" size="sm" className="gap-1">
                View all
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !recent?.length ? (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <FileText className="h-10 w-10" />
                <p>No documents yet</p>
                <Link
                  href="/documents/upload"
                  className="text-sm text-primary hover:underline"
                >
                  Upload your first document
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recent.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/documents/${doc.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium line-clamp-1">
                          {doc.filename}
                        </p>
                        {doc.template_name && (
                          <p className="text-xs text-muted-foreground">
                            {doc.template_name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          doc.status === "completed"
                            ? "default"
                            : doc.status === "failed"
                              ? "destructive"
                              : "secondary"
                        }
                        className="text-[11px]"
                      >
                        {doc.status === "extracting" ||
                        doc.status === "ocr_processing" ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : null}
                        {statusLabels[doc.status] || doc.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm">Extracted Data</CardTitle>
              <CardDescription>Data tables by template</CardDescription>
            </div>
            <Link href="/data">
              <Button variant="ghost" size="sm" className="gap-1">
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
              <div className="space-y-2">
                {dataSummary.templates.map((t) => (
                  <Link
                    key={t.template_id}
                    href={`/data/${t.template_id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted"
                  >
                    <div className="flex items-center gap-3">
                      <Table2 className="h-4 w-4 text-primary" />
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
                      <Badge variant="secondary">
                        {t.extraction_count} records
                      </Badge>
                      {t.pending_count > 0 && (
                        <Badge
                          variant="outline"
                          className="text-yellow-600 border-yellow-200"
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
