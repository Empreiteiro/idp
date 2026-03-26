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
import { Upload, FileText, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function NewTemplatePage() {
  const router = useRouter();
  const createMutation = useCreateTemplate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) setFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp"],
    },
    maxFiles: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }

    const formData = new FormData();
    formData.append("name", name.trim());
    if (description) formData.append("description", description);
    if (file) formData.append("file", file);

    createMutation.mutate(formData, {
      onSuccess: (data) => {
        toast.success("Template created! AI is analyzing the document...");
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
        description="Upload an example document to auto-detect extractable fields"
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
            <CardTitle>Example Document</CardTitle>
            <CardDescription>
              Upload an example document. AI will analyze it and suggest
              extractable fields.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors ${
                isDragActive
                  ? "border-primary bg-primary/5"
                  : file
                    ? "border-green-500 bg-green-50"
                    : "border-muted-foreground/25 hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              {file ? (
                <>
                  <FileText className="h-10 w-10 text-green-600" />
                  <div className="text-center">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                  >
                    Remove
                  </Button>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <div className="text-center">
                    <p className="font-medium">
                      Drop your document here or click to browse
                    </p>
                    <p className="text-sm text-muted-foreground">
                      PDF, PNG, JPG, TIFF (max 50MB)
                    </p>
                  </div>
                </>
              )}
            </div>
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
