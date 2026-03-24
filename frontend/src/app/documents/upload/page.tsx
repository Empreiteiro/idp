"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { useUploadDocument } from "@/hooks/use-documents";
import { useTemplates } from "@/hooks/use-templates";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  Loader2,
  ArrowLeft,
  X,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function UploadPage() {
  const router = useRouter();
  const uploadMutation = useUploadDocument();
  const { data: templates } = useTemplates();
  const [files, setFiles] = useState<File[]>([]);
  const [templateId, setTemplateId] = useState<string>("auto");

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

  const handleUpload = async () => {
    if (!files.length) {
      toast.error("Select at least one file");
      return;
    }

    let lastDocId: number | null = null;

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      if (templateId && templateId !== "auto") {
        formData.append("template_id", templateId);
      }

      try {
        const result = await uploadMutation.mutateAsync(formData);
        lastDocId = result.id;
        toast.success(`${file.name} uploaded and processing...`);
      } catch (err: any) {
        toast.error(
          `Failed to upload ${file.name}: ${err?.response?.data?.detail || "Unknown error"}`
        );
      }
    }

    if (files.length === 1 && lastDocId) {
      router.push(`/documents/${lastDocId}`);
    } else {
      router.push("/documents");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/documents">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Upload Documents</h1>
          <p className="text-muted-foreground">
            Upload documents for intelligent data extraction
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Template Selection</CardTitle>
          <CardDescription>
            Choose a template or let AI auto-classify your documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={templateId} onValueChange={(val) => setTemplateId(val ?? "auto")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4" />
                  Auto-classify (AI)
                </div>
              </SelectItem>
              {templates?.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.name} ({t.field_count} fields)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {templateId === "auto" && (
            <p className="mt-2 text-xs text-muted-foreground">
              AI will automatically classify the document and match it to an
              existing template
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Files</CardTitle>
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
                Drop files here or click to browse
              </p>
              <p className="text-sm text-muted-foreground">
                PDF, PNG, JPG, TIFF (max 50MB each)
              </p>
            </div>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(i)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Badge variant="secondary">{files.length} file(s) selected</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Link href="/documents" className="flex-1">
          <Button variant="outline" className="w-full">
            Cancel
          </Button>
        </Link>
        <Button
          className="flex-1"
          onClick={handleUpload}
          disabled={!files.length || uploadMutation.isPending}
        >
          {uploadMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload & Process
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
