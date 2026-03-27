"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { useCreateTemplate } from "@/hooks/use-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Upload, FileText, Loader2, ArrowLeft, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function NewTemplatePage() {
  const router = useRouter();
  const createMutation = useCreateTemplate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp"],
    },
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }

    const formData = new FormData();
    formData.append("name", name.trim());
    if (description) formData.append("description", description);
    files.forEach((file) => formData.append("files", file));

    createMutation.mutate(formData, {
      onSuccess: (data) => {
        const msg =
          files.length > 1
            ? `Template created! AI is analyzing ${files.length} documents...`
            : "Template created! AI is analyzing the document...";
        toast.success(msg);
        router.push(`/templates/${data.id}`);
      },
      onError: (err: any) => {
        toast.error(
          err?.response?.data?.detail || "Failed to create template"
        );
      },
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        title="New Template"
        description="Upload example documents to auto-detect extractable fields"
        actions={
          <Link href="/templates">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card className="synapse-shadow border-border/50 rounded-2xl">
          <CardHeader>
            <CardTitle>Template Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Invoice, Receipt, Contract"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the type of document this template handles..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="synapse-shadow border-border/50 rounded-2xl">
          <CardHeader>
            <CardTitle>Example Documents</CardTitle>
            <CardDescription>
              Upload one or more example documents. When multiple files are
              provided, AI will analyze all of them and compare differences to
              build a comprehensive field set.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              {...getRootProps()}
              className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors ${
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">
                  Drop your documents here or click to browse
                </p>
                <p className="text-sm text-muted-foreground">
                  PDF, PNG, JPG, TIFF (max 50MB each) — multiple files allowed
                </p>
              </div>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {files.length} file{files.length > 1 ? "s" : ""} selected
                </p>
                {files.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-green-600" />
                    <span className="flex-1 text-sm font-medium truncate">
                      {file.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-xl"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(idx);
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Link href="/templates" className="flex-1">
            <Button variant="outline" className="w-full rounded-xl" type="button">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            className="flex-1 rounded-xl"
            disabled={createMutation.isPending || !name.trim()}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating & Analyzing...
              </>
            ) : (
              "Create Template"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
