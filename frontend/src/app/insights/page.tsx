"use client";

import { useState } from "react";
import { useInsights, useDeleteInsight, useGenerateInsight } from "@/hooks/use-insights";
import { useInsightTemplates } from "@/hooks/use-insight-templates";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  BarChart3,
  Trash2,
  ExternalLink,
  Loader2,
  FileText,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  completed: "bg-green-100 text-green-800",
  generating: "bg-blue-100 text-blue-800",
  pending: "bg-yellow-100 text-yellow-800",
  failed: "bg-red-100 text-red-800",
};

export default function InsightsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useInsights({ page, limit: 20 });
  const deleteMutation = useDeleteInsight();

  // Generate dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [analysisMode, setAnalysisMode] = useState<string>("individual");
  const [selectedDocIds, setSelectedDocIds] = useState<string>("");
  const [customInstructions, setCustomInstructions] = useState("");
  const generateMutation = useGenerateInsight();

  const { data: insightTemplates } = useInsightTemplates();

  const handleDelete = (e: React.MouseEvent, id: number, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Delete insight "${title}"?`)) {
      deleteMutation.mutate(id, {
        onSuccess: () => toast.success("Insight deleted"),
        onError: () => toast.error("Failed to delete insight"),
      });
    }
  };

  const handleGenerate = () => {
    if (!selectedTemplateId) {
      toast.error("Select an insight template");
      return;
    }
    const ids = selectedDocIds
      .split(",")
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n) && n > 0);
    if (ids.length === 0) {
      toast.error("Enter at least one document ID");
      return;
    }

    generateMutation.mutate(
      {
        insight_template_id: Number(selectedTemplateId),
        document_ids: ids,
        analysis_mode: analysisMode as "individual" | "consolidated",
        custom_instructions: customInstructions.trim() || undefined,
      },
      {
        onSuccess: (res) => {
          toast.success(
            `Generated ${res.insights.length} insight(s) (${res.total_tokens} tokens, $${res.total_cost.toFixed(4)})`
          );
          setDialogOpen(false);
          setSelectedTemplateId("");
          setSelectedDocIds("");
          setCustomInstructions("");
        },
        onError: (err: any) =>
          toast.error(
            err?.response?.data?.message || "Insight generation failed"
          ),
      }
    );
  };

  const insights = data?.insights || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Document Insights</h1>
          <p className="text-muted-foreground">
            AI-generated analytical reports from your documents
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Insight
              </Button>
            }
          />
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Generate Document Insight</DialogTitle>
              <DialogDescription>
                Select an insight template and documents to analyze
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Insight Template *</label>
                <Select
                  value={selectedTemplateId}
                  onValueChange={(val) => setSelectedTemplateId(val ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select insight template" />
                  </SelectTrigger>
                  <SelectContent>
                    {insightTemplates
                      ?.filter((t) => t.is_active)
                      .map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.name} ({t.template_name})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Document IDs *</label>
                <Input
                  placeholder="e.g., 1, 2, 3"
                  value={selectedDocIds}
                  onChange={(e) => setSelectedDocIds(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated document IDs (must have completed extractions)
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Analysis Mode *</label>
                <Select value={analysisMode} onValueChange={(val) => setAnalysisMode(val ?? "individual")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">
                      Individual (one report per document)
                    </SelectItem>
                    <SelectItem value="consolidated">
                      Consolidated (single report for all documents)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Custom Instructions (optional)
                </label>
                <Textarea
                  placeholder="Any additional guidance for the analysis..."
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  rows={3}
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
                className="w-full"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : insights.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No insights yet</p>
            <p className="text-sm text-muted-foreground">
              Generate your first insight from processed documents
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Title</TableHead>
                  <TableHead>Insight Template</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead className="text-center">Documents</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[70px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {insights.map((insight) => (
                  <TableRow key={insight.id} className="group">
                    <TableCell>
                      <Link
                        href={`/insights/${insight.id}`}
                        className="flex items-center gap-2 font-medium text-primary hover:underline"
                      >
                        <BarChart3 className="h-4 w-4 flex-shrink-0" />
                        <span className="line-clamp-1">{insight.title}</span>
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {insight.insight_template_name || "\u2014"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {insight.analysis_mode === "consolidated"
                          ? "Consolidated"
                          : "Individual"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="gap-1">
                        <FileText className="h-3 w-3" />
                        {insight.document_count}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          statusColors[insight.status] || "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {insight.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(insight.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) =>
                          handleDelete(e, insight.id, insight.title)
                        }
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
