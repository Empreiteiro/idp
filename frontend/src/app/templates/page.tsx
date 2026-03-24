"use client";

import { useTemplates, useDeleteTemplate } from "@/hooks/use-templates";
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
import { FolderOpen, Plus, FileText, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function TemplatesPage() {
  const { data: templates, isLoading } = useTemplates();
  const deleteMutation = useDeleteTemplate();

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Delete template "${name}"? This cannot be undone.`)) {
      deleteMutation.mutate(id, {
        onSuccess: () => toast.success("Template deleted"),
        onError: () => toast.error("Failed to delete template"),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-muted-foreground">
            Manage document extraction templates
          </p>
        </div>
        <Link href="/templates/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : !templates?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No templates yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first template to start extracting data
            </p>
            <Link href="/templates/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Template
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id} className="group relative">
              <Link href={`/templates/${t.id}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-primary" />
                    {t.name}
                  </CardTitle>
                  {t.description && (
                    <CardDescription className="line-clamp-2">
                      {t.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    <Badge variant="secondary">
                      {t.field_count} fields
                    </Badge>
                    <Badge variant="outline">
                      <FileText className="mr-1 h-3 w-3" />
                      {t.document_count} docs
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Created {new Date(t.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete(t.id, t.name);
                }}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
