"use client";

import { useState, useCallback, useRef } from "react";
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
  FolderOpen,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";

export default function UploadPage() {
  const router = useRouter();
  const uploadMutation = useUploadDocument();
  const { data: templates } = useTemplates();
  const [files, setFiles] = useState<File[]>([]);
  const [templateId, setTemplateId] = useState<string>("auto");

  const folderInputRef = useRef<HTMLInputElement>(null);

  const acceptedExtensions = [".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp"];

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const handleFolderSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const folderFiles = Array.from(e.target.files || []).filter((f) =>
        acceptedExtensions.some((ext) => f.name.toLowerCase().endsWith(ext))
      );
      if (folderFiles.length === 0) {
        toast.info("No supported files found in the selected folder");
        return;
      }
      setFiles((prev) => [...prev, ...folderFiles]);
      e.target.value = "";
    },
    []
  );

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
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        title="Upload Documents"
        description="Upload documents for intelligent data extraction"
        actions={
          <Link href="/documents">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        }
      />

      <Card className="synapse-shadow border-border/50 rounded-2xl">
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

      <Card className="synapse-shadow border-border/50 rounded-2xl">
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

          <input
            ref={folderInputRef}
            type="file"
            className="hidden"
            /* @ts-expect-error webkitdirectory is non-standard but widely supported */
            webkitdirectory=""
            multiple
            onChange={handleFolderSelect}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl"
            onClick={() => folderInputRef.current?.click()}
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            Select Folder
          </Button>

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
              <Badge variant="secondary" className="rounded-full">{files.length} file(s) selected</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Link href="/documents" className="flex-1">
          <Button variant="outline" className="w-full rounded-xl">
            Cancel
          </Button>
        </Link>
        <Button
          className="flex-1 rounded-xl"
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
