"use client";

import { useTemplates, useDeleteTemplate } from "@/hooks/use-templates";
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
import { PageHeader } from "@/components/layout/page-header";
import { FolderOpen, Plus, FileText, Trash2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function TemplatesPage() {
  const { data: templates, isLoading } = useTemplates();
  const deleteMutation = useDeleteTemplate();

  const handleDelete = (e: React.MouseEvent, id: number, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Delete template "${name}"? This cannot be undone.`)) {
      deleteMutation.mutate(id, {
        onSuccess: () => toast.success("Template deleted"),
        onError: () => toast.error("Failed to delete template"),
      });
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Templates"
        description="Manage document extraction templates"
        actions={
          <Link href="/templates/new">
            <Button className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </Button>
          </Link>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !templates?.length ? (
        <Card className="synapse-shadow border-border/50 rounded-2xl">
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No templates yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first template to start extracting data
            </p>
            <Link href="/templates/new">
              <Button className="rounded-xl">
                <Plus className="mr-2 h-4 w-4" />
                Create Template
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-2xl border border-border/50 synapse-shadow">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Name</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Description</TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider">Fields</TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider">Documents</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Created</TableHead>
                <TableHead className="w-[70px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => (
                <TableRow key={t.id} className="group hover:bg-muted/30">
                  <TableCell>
                    <Link
                      href={`/templates/${t.id}`}
                      className="flex items-center gap-2 font-medium text-primary hover:underline"
                    >
                      <FolderOpen className="h-4 w-4 flex-shrink-0" />
                      {t.name}
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    <span className="text-muted-foreground line-clamp-1">
                      {t.description || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="rounded-full">{t.field_count}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="gap-1 rounded-full">
                      <FileText className="h-3 w-3" />
                      {t.document_count}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(t.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
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
