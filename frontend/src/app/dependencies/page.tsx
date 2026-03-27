"use client";

import { useState } from "react";
import {
  useDependencies,
  useInstallDependency,
  type DepStatus,
} from "@/hooks/use-dependencies";
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
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import {
  CheckCircle,
  XCircle,
  Download,
  Loader2,
  Monitor,
  AlertTriangle,
  ShieldCheck,
  Package,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

function StatusBadge({ dep }: { dep: DepStatus }) {
  if (dep.installed) {
    return (
      <Badge className="rounded-full gap-1 bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
        <CheckCircle className="h-3 w-3" />
        Installed
      </Badge>
    );
  }
  if (dep.required) {
    return (
      <Badge className="rounded-full gap-1 bg-red-100 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400">
        <XCircle className="h-3 w-3" />
        Missing
      </Badge>
    );
  }
  return (
    <Badge className="rounded-full gap-1 bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400">
      <XCircle className="h-3 w-3" />
      Not installed
    </Badge>
  );
}

function InstallButton({
  dep,
  type,
}: {
  dep: DepStatus;
  type: "python" | "system";
}) {
  const installMutation = useInstallDependency();
  const [installing, setInstalling] = useState(false);

  if (dep.installed) return null;

  const handleInstall = async () => {
    setInstalling(true);
    toast.info(
      `Installing ${dep.name}... The backend will be temporarily unavailable.`,
    );

    installMutation.mutate(
      { name: dep.name, type },
      {
        onSuccess: (result) => {
          setInstalling(false);
          if (result.status === "ok") {
            toast.success(result.message);
          } else {
            toast.error(result.message, {
              description: result.output || undefined,
              duration: 8000,
            });
          }
        },
        onError: (err) => {
          setInstalling(false);
          toast.error(`Failed to install ${dep.name}`, {
            description: err.message,
          });
        },
      },
    );
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className="rounded-xl gap-1.5"
      onClick={handleInstall}
      disabled={installing}
    >
      {installing ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      {installing ? "Installing..." : "Install"}
    </Button>
  );
}

export default function DependenciesPage() {
  const { data, isLoading } = useDependencies();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        title="Dependencies"
        description="Manage Python packages and system tools required by the platform"
      />

      {/* OS Info */}
      {data?.os_info && (
        <Card className="synapse-shadow border-border/50 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Monitor className="h-4 w-4" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Badge variant="secondary" className="rounded-full">
                OS: {data.os_info.os_display}
              </Badge>
              <Badge variant="secondary" className="rounded-full">
                Arch: {data.os_info.arch}
              </Badge>
              <Badge variant="secondary" className="rounded-full">
                Python: {data.os_info.python.split(" ")[0]}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {data && (
        <Card className="synapse-shadow border-border/50 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              {data.ok ? (
                <ShieldCheck className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
              Validation Status
            </CardTitle>
            <CardDescription>{data.summary}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Python Packages Table */}
      <Card className="synapse-shadow border-border/50 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Python Packages
          </CardTitle>
          <CardDescription>
            Python libraries used for document processing, AI providers, and the web framework
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.python_packages.map((dep) => (
                  <TableRow key={dep.name}>
                    <TableCell className="font-medium font-mono text-xs">
                      {dep.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {dep.detail}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {dep.version || "—"}
                    </TableCell>
                    <TableCell>
                      {dep.required ? (
                        <Badge variant="secondary" className="rounded-full text-xs">
                          Required
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="rounded-full text-xs">
                          Optional
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge dep={dep} />
                    </TableCell>
                    <TableCell className="text-right">
                      <InstallButton dep={dep} type="python" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* System Tools Table */}
      <Card className="synapse-shadow border-border/50 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            System Tools
          </CardTitle>
          <CardDescription>
            External binaries used for OCR and PDF processing.
            {data?.os_info && (
              <span>
                {" "}Install commands are tailored for{" "}
                <strong>{data.os_info.os_display}</strong>.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tool</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.system_tools.map((dep) => (
                  <TableRow key={dep.name}>
                    <TableCell className="font-medium font-mono text-xs">
                      {dep.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {dep.detail}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {dep.version || "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge dep={dep} />
                    </TableCell>
                    <TableCell className="text-right">
                      <InstallButton dep={dep} type="system" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
