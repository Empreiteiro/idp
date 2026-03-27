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
import { Card, CardContent } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
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
  Settings,
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
        {/* API Key */}
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
// Main Page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const { data, isLoading } = useProviders();
  const setDefaultMutation = useSetDefaultProvider();
  const deleteMutation = useDeleteProvider();
  const testMutation = useTestProvider();
  const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(null);
  const [testResults, setTestResults] = useState<Record<number, { status: string; message: string }>>({});

  const handleSetDefault = (id: number) => {
    setDefaultMutation.mutate(id, {
      onSuccess: () => toast.success("Default provider updated"),
      onError: () => toast.error("Failed to update default"),
    });
  };

  const handleDelete = (e: React.MouseEvent, p: ProviderConfig) => {
    e.preventDefault();
    e.stopPropagation();
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

  const providers = data?.providers ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Configure AI and OCR providers for document processing"
      />

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !providers.length ? (
        <Card className="synapse-shadow border-border/50 rounded-2xl">
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Settings className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No providers configured</p>
            <p className="text-sm text-muted-foreground">
              Providers will be seeded automatically on first load
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-2xl border border-border/50 synapse-shadow">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Provider</TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider">Type</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Model</TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider">API Key</TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider">Default</TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.map((p) => {
                const testResult = testResults[p.id];
                return (
                  <TableRow key={p.id} className="group hover:bg-muted/30">
                    <TableCell>
                      <span className="font-medium">{p.display_name}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="secondary"
                        className="rounded-full"
                      >
                        {p.kind === "ai" ? "AI" : "OCR"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">
                        {p.model || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {p.has_key ? (
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
                    <TableCell className="text-center">
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
                    <TableCell className="text-center">
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
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleTest(p)}
                          disabled={testMutation.isPending}
                          title="Test connection"
                        >
                          {testMutation.isPending && testMutation.variables === p.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Zap className="h-4 w-4" />
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
                              className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setEditingProvider(p)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            {editingProvider && (
                              <EditProviderDialog
                                provider={editingProvider}
                                availableModels={data?.available_models ?? {}}
                                onClose={() => setEditingProvider(null)}
                              />
                            )}
                          </DialogContent>
                        </Dialog>
                        {!p.is_default && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleDelete(e, p)}
                            disabled={deleteMutation.isPending}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
