"use client";

import { useDataSummary } from "@/hooks/use-data-tables";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table2, FileText, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";

export default function DataPage() {
  const { data, isLoading } = useDataSummary();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Extracted Data</h1>
        <p className="text-muted-foreground">
          View and export extracted data organized by template
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : !data?.templates.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Table2 className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No data yet</p>
            <p className="text-sm text-muted-foreground">
              Process documents to see extracted data here
            </p>
            <Link
              href="/documents/upload"
              className="text-sm text-primary hover:underline"
            >
              Upload documents
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.templates.map((t) => (
            <Link key={t.template_id} href={`/data/${t.template_id}`}>
              <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Table2 className="h-5 w-5 text-primary" />
                    {t.template_name}
                  </CardTitle>
                  <CardDescription>
                    {t.field_count} columns &middot; {t.extraction_count} rows
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <FileText className="h-3 w-3" />
                      {t.extraction_count} extractions
                    </Badge>
                    <Badge
                      variant="outline"
                      className="gap-1 text-green-600 border-green-200"
                    >
                      <CheckCircle className="h-3 w-3" />
                      {t.reviewed_count} reviewed
                    </Badge>
                    {t.pending_count > 0 && (
                      <Badge
                        variant="outline"
                        className="gap-1 text-yellow-600 border-yellow-200"
                      >
                        <Clock className="h-3 w-3" />
                        {t.pending_count} pending
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
