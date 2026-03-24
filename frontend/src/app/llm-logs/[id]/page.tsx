"use client";

import { useParams } from "next/navigation";
import { useLLMLogDetail } from "@/hooks/use-llm-logs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  DollarSign,
  FileText,
  FolderOpen,
  Copy,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

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

function CodeBlock({ title, content }: { title: string; content: string | null }) {
  if (!content) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={handleCopy}>
          <Copy className="h-3 w-3" />
          Copy
        </Button>
      </div>
      <pre className="max-h-[400px] overflow-auto rounded-lg border bg-muted/50 p-4 text-xs font-mono whitespace-pre-wrap break-words">
        {content}
      </pre>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub }: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

export default function LLMLogDetailPage() {
  const params = useParams();
  const logId = Number(params.id);
  const { data: log, isLoading } = useLLMLogDetail(logId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-60" />
      </div>
    );
  }

  if (!log) return <p>Log entry not found</p>;

  const latencyStr = log.latency_ms !== null
    ? log.latency_ms < 1000 ? `${log.latency_ms}ms` : `${(log.latency_ms / 1000).toFixed(2)}s`
    : "—";

  const costStr = log.estimated_cost !== null && log.estimated_cost > 0
    ? log.estimated_cost < 0.01 ? `$${log.estimated_cost.toFixed(4)}` : `$${log.estimated_cost.toFixed(3)}`
    : "—";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/llm-logs">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">Request #{log.id}</h1>
            {log.status === "success" ? (
              <Badge className="bg-green-100 text-green-700 gap-1">
                <CheckCircle className="h-3 w-3" /> Success
              </Badge>
            ) : (
              <Badge className="bg-red-100 text-red-700 gap-1">
                <XCircle className="h-3 w-3" /> Error
              </Badge>
            )}
            <Badge variant="secondary">
              {typeLabels[log.request_type] || log.request_type}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date(log.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={Zap}
          label="Provider / Model"
          value={log.provider}
          sub={log.model}
        />
        <MetricCard
          icon={Clock}
          label="Latency"
          value={latencyStr}
        />
        <MetricCard
          icon={Zap}
          label="Tokens"
          value={log.total_tokens !== null ? log.total_tokens.toLocaleString() : "—"}
          sub={
            log.prompt_tokens !== null
              ? `In: ${log.prompt_tokens.toLocaleString()} / Out: ${(log.completion_tokens ?? 0).toLocaleString()}`
              : undefined
          }
        />
        <MetricCard
          icon={DollarSign}
          label="Estimated Cost"
          value={costStr}
        />
      </div>

      {/* Entity link */}
      {(log.document_id || log.template_id || log.entity_name) && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
          {log.document_id && (
            <Link
              href={`/documents/${log.document_id}`}
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <FileText className="h-4 w-4" />
              Document #{log.document_id}
            </Link>
          )}
          {log.template_id && (
            <Link
              href={`/templates/${log.template_id}`}
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <FolderOpen className="h-4 w-4" />
              Template #{log.template_id}
            </Link>
          )}
          {log.entity_name && (
            <span className="text-sm text-muted-foreground">
              {log.entity_name}
            </span>
          )}
        </div>
      )}

      {/* Error */}
      {log.error_message && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium">Error</p>
            <pre className="mt-1 whitespace-pre-wrap font-mono text-xs">{log.error_message}</pre>
          </div>
        </div>
      )}

      {/* Prompts & Response */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Request / Response Trace</CardTitle>
          <CardDescription>Full content of the AI provider call</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <CodeBlock title="System Prompt" content={log.system_prompt} />
          <Separator />
          <CodeBlock title="User Prompt" content={log.user_prompt} />
          <Separator />
          <CodeBlock title="Response" content={log.response_text} />
        </CardContent>
      </Card>
    </div>
  );
}
