"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTemplates } from "@/hooks/use-templates";
import { useCreateInsightTemplate } from "@/hooks/use-insight-templates";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function NewInsightTemplatePage() {
  const router = useRouter();
  const { data: templates } = useTemplates();
  const createMutation = useCreateInsightTemplate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [systemPrompt, setSystemPrompt] = useState("");

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!templateId) {
      toast.error("Please select a linked document template");
      return;
    }

    createMutation.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        template_id: Number(templateId),
        system_prompt: systemPrompt.trim() || undefined,
      },
      {
        onSuccess: (data) => {
          toast.success("Insight template created!");
          router.push(`/insight-templates/${data.id}`);
        },
        onError: (err: any) => {
          toast.error(
            err?.response?.data?.message || "Failed to create insight template"
          );
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/insight-templates">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Insight Template</h1>
          <p className="text-muted-foreground">
            Create an analytical report template for a document type
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Template Details</CardTitle>
          <CardDescription>
            Define the insight template name, linked document template, and
            optional system prompt for the AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Name *</label>
            <Input
              placeholder="e.g., Income Tax Analysis"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Description</label>
            <Input
              placeholder="Brief description of this insight template"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Linked Document Template *
            </label>
            <Select value={templateId} onValueChange={(val) => setTemplateId(val ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select a document template" />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name} ({t.field_count} fields)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The insight will analyze documents processed with this template
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Custom System Prompt (optional)
            </label>
            <Textarea
              placeholder="Additional instructions for the AI when generating insights..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Extra guidance appended to the default analysis prompt
            </p>
          </div>

          <Button
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="w-full"
          >
            {createMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create Insight Template
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
