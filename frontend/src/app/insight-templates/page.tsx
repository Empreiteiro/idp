"use client";

import {
  useInsightTemplates,
  useDeleteInsightTemplate,
} from "@/hooks/use-insight-templates";
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
  Lightbulb,
  Plus,
  Trash2,
  ExternalLink,
  FolderOpen,
  ListChecks,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function InsightTemplatesPage() {
  const { data: templates, isLoading } = useInsightTemplates();
  const deleteMutation = useDeleteInsightTemplate();

  const handleDelete = (e: React.MouseEvent, id: number, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Delete insight template "${name}"? This cannot be undone.`)) {
      deleteMutation.mutate(id, {
        onSuccess: () => toast.success("Insight template deleted"),
        onError: () => toast.error("Failed to delete insight template"),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Insight Templates</h1>
          <p className="text-muted-foreground">
            Define analytical report templates for your documents
          </p>
        </div>
        <Link href="/insight-templates/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Insight Template
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !templates?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Lightbulb className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No insight templates yet</p>
            <p className="text-sm text-muted-foreground">
              Create an insight template to start generating analytical reports
            </p>
            <Link href="/insight-templates/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Insight Template
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Linked Template</TableHead>
                <TableHead className="text-center">Sections</TableHead>
                <TableHead className="text-center">Insights</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[70px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => (
                <TableRow key={t.id} className="group">
                  <TableCell>
                    <Link
                      href={`/insight-templates/${t.id}`}
                      className="flex items-center gap-2 font-medium text-primary hover:underline"
                    >
                      <Lightbulb className="h-4 w-4 flex-shrink-0" />
                      {t.name}
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[250px]">
                    <span className="text-muted-foreground line-clamp-1">
                      {t.description || "\u2014"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      <FolderOpen className="h-3 w-3" />
                      {t.template_name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="gap-1">
                      <ListChecks className="h-3 w-3" />
                      {t.section_count}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="gap-1">
                      <BarChart3 className="h-3 w-3" />
                      {t.insight_count}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={t.is_active ? "default" : "secondary"}
                    >
                      {t.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(t.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDelete(e, t.id, t.name)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
