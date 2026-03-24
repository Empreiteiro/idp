"use client";

import { useState } from "react";
import { useLLMLogs, useLLMStats } from "@/hooks/use-llm-logs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  Zap,
  Clock,
  DollarSign,
  Hash,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

const typeLabels: Record<string, string> = {
  extraction: "Extraction",
  classification: "Classification",
  field_suggestion: "Field Suggestion",
  connection_test: "Connection Test",
};

const providerColors: Record<string, string> = {
  openai: "bg-green-100 text-green-700 border-green-200",
  claude: "bg-orange-100 text-orange-700 border-orange-200",
  gemini: "bg-blue-100 text-blue-700 border-blue-200",
};

function formatLatency(ms: number | null) {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTokens(n: number | null) {
  if (n === null) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function formatCost(cost: number | null) {
  if (cost === null || cost === 0) return "—";
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(3)}`;
}

export default function LLMLogsPage() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: stats, isLoading: statsLoading } = useLLMStats();
  const { data, isLoading } = useLLMLogs({
    page,
    limit: 30,
    request_type: typeFilter || undefined,
    provider: providerFilter || undefined,
    status: statusFilter || undefined,
  });

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">LLM Logs</h1>
        <p className="text-muted-foreground">
          Trace and monitor all AI provider requests
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Requests
            </CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.total_requests ?? 0}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Tokens
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {formatTokens(stats?.total_tokens ?? 0)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Est. Cost
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {formatCost(stats?.total_cost ?? 0)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Avg Latency
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {formatLatency(stats?.avg_latency_ms ?? null)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Success Rate
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.success_rate ?? 0}%
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Breakdown badges */}
      {stats && (stats.by_provider && Object.keys(stats.by_provider).length > 0) && (
        <div className="flex flex-wrap gap-4">
          {Object.keys(stats.by_provider).length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">By provider:</span>
              {Object.entries(stats.by_provider).map(([p, count]) => (
                <Badge key={p} variant="outline" className={providerColors[p] || ""}>
                  {p} ({count})
                </Badge>
              ))}
            </div>
          )}
          {Object.keys(stats.by_type).length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">By type:</span>
              {Object.entries(stats.by_type).map(([t, count]) => (
                <Badge key={t} variant="secondary">
                  {typeLabels[t] || t} ({count})
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={typeFilter}
          onValueChange={(val) => { setTypeFilter(val ?? ""); setPage(1); }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(typeLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={providerFilter}
          onValueChange={(val) => { setProviderFilter(val ?? ""); setPage(1); }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All providers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All providers</SelectItem>
            <SelectItem value="openai">OpenAI</SelectItem>
            <SelectItem value="claude">Claude</SelectItem>
            <SelectItem value="gemini">Gemini</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(val) => { setStatusFilter(val ?? ""); setPage(1); }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        {(typeFilter || providerFilter || statusFilter) && (
          <Button variant="ghost" onClick={() => {
            setTypeFilter(""); setProviderFilter(""); setStatusFilter(""); setPage(1);
          }}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data?.logs.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Activity className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No LLM requests yet</p>
            <p className="text-sm text-muted-foreground">
              Process documents or test AI connection to generate logs
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Provider / Model</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Latency</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.logs.map((log) => (
                  <TableRow key={log.id} className="group">
                    <TableCell>
                      <Link
                        href={`/llm-logs/${log.id}`}
                        className="flex items-center gap-1 text-primary hover:underline font-mono text-xs"
                      >
                        {new Date(log.created_at).toLocaleString()}
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[11px]">
                        {typeLabels[log.request_type] || log.request_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <Badge variant="outline" className={`text-[11px] w-fit ${providerColors[log.provider] || ""}`}>
                          {log.provider}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {log.model}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <span className="text-xs text-muted-foreground truncate block">
                        {log.entity_name || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {log.total_tokens !== null ? (
                        <span title={`In: ${log.prompt_tokens ?? "?"} / Out: ${log.completion_tokens ?? "?"}`}>
                          {formatTokens(log.total_tokens)}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatLatency(log.latency_ms)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatCost(log.estimated_cost)}
                    </TableCell>
                    <TableCell>
                      {log.status === "success" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Showing {(page - 1) * data.limit + 1}–
                {Math.min(page * data.limit, data.total)} of {data.total}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
