"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  useInsightTemplate,
  useSuggestSections,
  useAddSection,
  useDeleteSection,
} from "@/hooks/use-insight-templates";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Wand2,
  FolderOpen,
  BarChart3,
  ListChecks,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";

export default function InsightTemplateDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const { data: template, isLoading } = useInsightTemplate(id);
  const suggestMutation = useSuggestSections();
  const addSectionMutation = useAddSection();
  const deleteSectionMutation = useDeleteSection();

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPromptHint, setNewPromptHint] = useState("");

  const handleAddSection = () => {
    if (!newTitle.trim()) {
      toast.error("Section title is required");
      return;
    }
    addSectionMutation.mutate(
      {
        insightTemplateId: id,
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        prompt_hint: newPromptHint.trim() || undefined,
      },
      {
        onSuccess: () => {
          setNewTitle("");
          setNewDescription("");
          setNewPromptHint("");
          toast.success("Section added");
        },
        onError: () => toast.error("Failed to add section"),
      }
    );
  };

  const handleDeleteSection = (sectionId: number) => {
    deleteSectionMutation.mutate(
      { insightTemplateId: id, sectionId },
      {
        onSuccess: () => toast.success("Section removed"),
        onError: () => toast.error("Failed to remove section"),
      }
    );
  };

  const handleSuggestSections = () => {
    suggestMutation.mutate(id, {
      onSuccess: () =>
        toast.success("Sections suggested by AI! Review them below."),
      onError: (err: any) =>
        toast.error(
          err?.response?.data?.message || "Section suggestion failed"
        ),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!template) {
    return <p>Insight template not found</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/insight-templates">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <PageHeader
            title={template.name}
            description={template.description || undefined}
          />
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="gap-1 rounded-full">
            <FolderOpen className="h-3 w-3" />
            {template.template_name}
          </Badge>
          <Badge variant="outline" className="gap-1 rounded-full">
            <BarChart3 className="h-3 w-3" />
            {template.insight_count} insights
          </Badge>
          <Badge variant={template.is_active ? "default" : "secondary"} className="rounded-full">
            {template.is_active ? "Active" : "Inactive"}
          </Badge>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={handleSuggestSections}
            disabled={suggestMutation.isPending}
          >
            {suggestMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            AI Suggest Sections
          </Button>
        </div>
      </div>

      {/* System Prompt */}
      {template.system_prompt && (
        <Card className="synapse-shadow border-border/50 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Custom System Prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {template.system_prompt}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Sections */}
      <Card className="synapse-shadow border-border/50 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Report Sections
          </CardTitle>
          <CardDescription>
            Define the sections that the analytical report should contain
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {template.sections.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">
              No sections yet. Add sections manually or use AI suggestion.
            </p>
          ) : (
            <div className="space-y-2">
              {template.sections.map((section) => (
                <div key={section.id} className="rounded-lg border p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="font-medium">{section.title}</p>
                      {section.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {section.description}
                        </p>
                      )}
                      {section.prompt_hint && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          Hint: {section.prompt_hint}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="rounded-full">#{section.sort_order}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-xl"
                      onClick={() => handleDeleteSection(section.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Section Form */}
          <div className="space-y-3 rounded-lg border border-dashed p-3">
            <p className="text-sm font-medium">Add Section</p>
            <div className="space-y-2">
              <Input
                placeholder="Section title (e.g., Income Summary)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <Input
                placeholder="Description (what this section should analyze)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
              <Input
                placeholder="Prompt hint (optional guidance for the AI)"
                value={newPromptHint}
                onChange={(e) => setNewPromptHint(e.target.value)}
              />
              <Button
                className="rounded-xl"
                onClick={handleAddSection}
                disabled={addSectionMutation.isPending}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Section
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
