"use client";

import { useDataSummary } from "@/hooks/use-data-tables";
import { Card, CardContent } from "@/components/ui/card";
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
  Table2,
  CheckCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";

export default function DataPage() {
  const { data, isLoading } = useDataSummary();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Extracted Data"
        description="View and export extracted data organized by template"
      />

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data?.templates.length ? (
        <Card className="synapse-shadow border-border/50 rounded-2xl">
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
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Template</TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider">Fields</TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider">Extractions</TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider">Reviewed</TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider">Pending</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.templates.map((t) => (
                <TableRow key={t.template_id} className="group hover:bg-muted/30">
                  <TableCell>
                    <Link
                      href={`/data/${t.template_id}`}
                      className="flex items-center gap-2 font-medium text-primary hover:underline"
                    >
                      <Table2 className="h-4 w-4 flex-shrink-0" />
                      {t.template_name}
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="rounded-full">{t.field_count}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="rounded-full">{t.extraction_count}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className="gap-1 rounded-full text-green-600 border-green-200"
                    >
                      <CheckCircle className="h-3 w-3" />
                      {t.reviewed_count}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {t.pending_count > 0 ? (
                      <Badge
                        variant="outline"
                        className="gap-1 rounded-full text-yellow-600 border-yellow-200"
                      >
                        <Clock className="h-3 w-3" />
                        {t.pending_count}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
