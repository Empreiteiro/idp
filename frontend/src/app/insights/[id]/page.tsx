"use client";

import { useParams, useRouter } from "next/navigation";
import { useInsight, useRegenerateInsight, useDeleteInsight } from "@/hooks/use-insights";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  BarChart3,
  FileText,
  RefreshCw,
  Loader2,
  Trash2,
  Clock,
  Coins,
  Cpu,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  completed: "bg-green-100 text-green-800",
  generating: "bg-blue-100 text-blue-800",
  pending: "bg-yellow-100 text-yellow-800",
  failed: "bg-red-100 text-red-800",
};

export default function InsightDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const { data: insight, isLoading } = useInsight(id);
  const regenerateMutation = useRegenerateInsight();
  const deleteMutation = useDeleteInsight();

  const handleRegenerate = () => {
    regenerateMutation.mutate(id, {
      onSuccess: (data) => {
        toast.success("Insight regenerated!");
        router.push(`/insights/${data.id}`);
      },
      onError: (err: any) =>
        toast.error(err?.response?.data?.message || "Regeneration failed"),
    });
  };

  const handleDelete = () => {
    if (confirm("Delete this insight? This cannot be undone.")) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          toast.success("Insight deleted");
          router.push("/insights");
        },
        onError: () => toast.error("Failed to delete insight"),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!insight) {
    return <p>Insight not found</p>;
  }

  const meta = insight.metadata || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/insights">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{insight.title}</h1>
            <p className="text-muted-foreground">
              {insight.insight_template_name || "Unknown template"} &middot;{" "}
              {insight.analysis_mode === "consolidated"
                ? "Consolidated"
                : "Individual"}{" "}
              analysis
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
              statusColors[insight.status] || "bg-gray-100 text-gray-800"
            }`}
          >
            {insight.status}
          </span>
          <Button
            variant="outline"
            onClick={handleRegenerate}
            disabled={regenerateMutation.isPending}
          >
            {regenerateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Regenerate
          </Button>
          <Button variant="destructive" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Error */}
          {insight.error_message && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="py-3">
                <p className="text-sm text-red-800">{insight.error_message}</p>
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          {insight.summary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Executive Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {insight.summary}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Full Report */}
          {insight.content && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Full Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                  {insight.content}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Generation Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {meta.provider && (
                <div className="flex items-center gap-2 text-sm">
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Provider:</span>
                  <Badge variant="outline" className="text-xs">
                    {String(meta.provider)} / {String(meta.model || "")}
                  </Badge>
                </div>
              )}
              {meta.total_tokens != null && (
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Tokens:</span>
                  <span>{Number(meta.total_tokens).toLocaleString()}</span>
                </div>
              )}
              {meta.estimated_cost != null && (
                <div className="flex items-center gap-2 text-sm">
                  <Coins className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Cost:</span>
                  <span>${Number(meta.estimated_cost).toFixed(4)}</span>
                </div>
              )}
              {meta.latency_ms != null && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Latency:</span>
                  <span>
                    {Number(meta.latency_ms) >= 1000
                      ? `${(Number(meta.latency_ms) / 1000).toFixed(1)}s`
                      : `${meta.latency_ms}ms`}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Created:</span>
                <span>
                  {new Date(insight.created_at).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Documents ({insight.documents.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {insight.documents.map((doc) => (
                <Link
                  key={doc.document_id}
                  href={`/documents/${doc.document_id}`}
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span className="line-clamp-1">{doc.filename}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
