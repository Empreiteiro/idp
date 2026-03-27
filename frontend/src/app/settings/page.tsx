"use client";

import { useState } from "react";
import {
  useProviders,
  useUpdateProvider,
  useDeleteProvider,
  useSetDefaultProvider,
  useTestProvider,
} from "@/hooks/use-settings";
import type { ProviderConfig } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  Brain,
  ScanLine,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Zap,
  Pencil,
  Trash2,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";

// ---------------------------------------------------------------------------
// Edit Provider Dialog
// ---------------------------------------------------------------------------

function EditProviderDialog({
  provider,
  availableModels,
  onClose,
}: {
  provider: ProviderConfig;
  availableModels: Record<string, string[]>;
  onClose: () => void;
}) {
  const updateMutation = useUpdateProvider();

  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(provider.model);
  const [showKey, setShowKey] = useState(false);
  const [extraConfig, setExtraConfig] = useState(provider.extra_config || {});

  const models = availableModels[provider.provider_name] || [];

  const handleSave = () => {
    const payload: Parameters<typeof updateMutation.mutate>[0] = {
      id: provider.id,
      model,
    };
    if (apiKey) {
      payload.api_key = apiKey;
    }
    if (provider.kind === "ocr") {
      payload.extra_config = extraConfig;
    }
    updateMutation.mutate(payload, {
      onSuccess: () => {
        toast.success(`${provider.display_name} updated`);
        onClose();
      },
      onError: () => toast.error("Failed to update provider"),
    });
  };

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Edit {provider.display_name}</DialogTitle>
        <DialogDescription>
          Configure API key{models.length > 0 ? " and model" : ""} for this provider
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        {/* API Key (not for tesseract) */}
        {provider.provider_name !== "tesseract" && (
          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                placeholder={provider.has_key ? "Leave empty to keep current key" : "Enter API key"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setShowKey(!showKey)}
                type="button"
              >
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
            </div>
            {provider.has_key && (
              <p className="text-xs text-muted-foreground">
                Current key: {provider.api_key}
              </p>
            )}
          </div>
        )}

        {/* Model selector */}
        {models.length > 0 && (
          <div className="space-y-2">
            <Label>Model</Label>
            <Select value={model} onValueChange={(val) => setModel(val ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Extra config for Tesseract */}
        {provider.provider_name === "tesseract" && (
          <>
            <div className="space-y-2">
              <Label>Tesseract Path</Label>
              <Input
                placeholder="e.g., C:\Program Files\Tesseract-OCR\tesseract.exe"
                value={extraConfig.tesseract_path || ""}
                onChange={(e) => setExtraConfig({ ...extraConfig, tesseract_path: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use system PATH.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Poppler Path</Label>
              <Input
                placeholder="e.g., C:\poppler\Library\bin"
                value={extraConfig.poppler_path || ""}
                onChange={(e) => setExtraConfig({ ...extraConfig, poppler_path: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Required for scanned PDF OCR on Windows.
              </p>
            </div>
          </>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save
        </Button>
      </DialogFooter>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Provider Table
// ---------------------------------------------------------------------------

function ProviderTable({
  providers,
  kind,
  availableModels,
}: {
  providers: ProviderConfig[];
  kind: "ai" | "ocr";
  availableModels: Record<string, string[]>;
}) {
  const setDefaultMutation = useSetDefaultProvider();
  const deleteMutation = useDeleteProvider();
  const testMutation = useTestProvider();
  const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(null);
  const [testResults, setTestResults] = useState<Record<number, { status: string; message: string }>>({});

  const filtered = providers.filter((p) => p.kind === kind);

  const handleSetDefault = (id: number) => {
    setDefaultMutation.mutate(id, {
      onSuccess: () => toast.success("Default provider updated"),
      onError: () => toast.error("Failed to update default"),
    });
  };

  const handleDelete = (p: ProviderConfig) => {
    if (p.is_default) {
      toast.error("Cannot delete the default provider");
      return;
    }
    deleteMutation.mutate(p.id, {
      onSuccess: () => toast.success(`${p.display_name} removed`),
      onError: () => toast.error("Failed to delete provider"),
    });
  };

  const handleTest = (p: ProviderConfig) => {
    testMutation.mutate(p.id, {
      onSuccess: (result) => {
        setTestResults((prev) => ({ ...prev, [p.id]: result }));
        if (result.status === "ok") {
          toast.success(result.message);
        } else {
          toast.error(result.message);
        }
      },
      onError: () => toast.error("Connection test failed"),
    });
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Provider</TableHead>
            {kind === "ai" && <TableHead>Model</TableHead>}
            <TableHead>API Key</TableHead>
            <TableHead>Default</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((p) => {
            const testResult = testResults[p.id];
            return (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  {p.display_name}
                </TableCell>
                {kind === "ai" && (
                  <TableCell className="font-mono text-xs">
                    {p.model || "—"}
                  </TableCell>
                )}
                <TableCell>
                  {p.provider_name === "tesseract" ? (
                    <span className="text-xs text-muted-foreground">N/A</span>
                  ) : p.has_key ? (
                    <Badge className="rounded-full gap-1 bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
                      <CheckCircle className="h-3 w-3" />
                      Configured
                    </Badge>
                  ) : (
                    <Badge className="rounded-full gap-1 bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400">
                      <XCircle className="h-3 w-3" />
                      Not set
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {p.is_default ? (
                    <Badge className="rounded-full gap-1 bg-primary/10 text-primary">
                      <Star className="h-3 w-3 fill-current" />
                      Default
                    </Badge>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground"
                      onClick={() => handleSetDefault(p.id)}
                      disabled={setDefaultMutation.isPending}
                    >
                      Set default
                    </Button>
                  )}
                </TableCell>
                <TableCell>
                  {testResult ? (
                    testResult.status === "ok" ? (
                      <Badge className="rounded-full gap-1 bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle className="h-3 w-3" />
                        OK
                      </Badge>
                    ) : (
                      <Badge className="rounded-full gap-1 bg-red-100 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400">
                        <XCircle className="h-3 w-3" />
                        Error
                      </Badge>
                    )
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleTest(p)}
                      disabled={testMutation.isPending}
                      title="Test connection"
                    >
                      {testMutation.isPending && testMutation.variables === p.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Zap className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Dialog
                      open={editingProvider?.id === p.id}
                      onOpenChange={(open) => {
                        if (!open) setEditingProvider(null);
                      }}
                    >
                      <DialogTrigger>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditingProvider(p)}
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        {editingProvider && (
                          <EditProviderDialog
                            provider={editingProvider}
                            availableModels={availableModels}
                            onClose={() => setEditingProvider(null)}
                          />
                        )}
                      </DialogContent>
                    </Dialog>
                    {!p.is_default && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(p)}
                        disabled={deleteMutation.isPending}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const { data, isLoading } = useProviders();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        title="Settings"
        description="Configure AI and OCR providers for document processing"
      />

      {/* AI Providers */}
      <Card className="synapse-shadow border-border/50 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Providers
          </CardTitle>
          <CardDescription>
            Configure which AI models to use for document analysis and data extraction.
            The default provider will be used for all processing tasks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : data ? (
            <ProviderTable
              providers={data.providers}
              kind="ai"
              availableModels={data.available_models}
            />
          ) : null}
        </CardContent>
      </Card>

      {/* OCR Providers */}
      <Card className="synapse-shadow border-border/50 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            OCR Providers
          </CardTitle>
          <CardDescription>
            Configure OCR engines for document pre-processing.
            Tesseract runs locally; Mistral OCR uses a cloud API for high-quality extraction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : data ? (
            <ProviderTable
              providers={data.providers}
              kind="ocr"
              availableModels={data.available_models}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
