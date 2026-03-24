"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useDataTable, exportTemplateCSV } from "@/hooks/use-data-tables";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Download,
  Search,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

function ConfidenceDot({ value }: { value: number }) {
  const color =
    value >= 0.9
      ? "bg-green-500"
      : value >= 0.7
        ? "bg-yellow-500"
        : "bg-red-500";
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${color}`}
      title={`${Math.round(value * 100)}% confidence`}
    />
  );
}

export default function DataTablePage() {
  const params = useParams();
  const templateId = Number(params.templateId);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [reviewedOnly, setReviewedOnly] = useState(false);

  const { data, isLoading } = useDataTable(templateId, {
    page,
    limit: 50,
    reviewed_only: reviewedOnly,
    search: search || undefined,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/data">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              {data?.template_name || "Loading..."}
            </h1>
            <p className="text-muted-foreground">
              {data?.total ?? 0} records
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => exportTemplateCSV(templateId, reviewedOnly)}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search in extracted data..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-64 pl-9"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
          {search && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setSearchInput("");
                setPage(1);
              }}
            >
              Clear
            </Button>
          )}
        </form>
        <div className="flex items-center gap-2">
          <Switch
            checked={reviewedOnly}
            onCheckedChange={(checked) => {
              setReviewedOnly(checked);
              setPage(1);
            }}
          />
          <span className="text-sm text-muted-foreground">
            Reviewed only
          </span>
        </div>
      </div>

      {/* Data Table */}
      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : !data?.rows.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <p className="text-lg font-medium">No data found</p>
            <p className="text-sm text-muted-foreground">
              {search
                ? "Try a different search term"
                : "Process documents using this template to see data here"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground">
                      Document
                    </th>
                    {data.columns.map((col) => (
                      <th
                        key={col.field_name}
                        className="whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground"
                      >
                        {col.field_label}
                        <span className="ml-1 text-[10px] text-muted-foreground/60">
                          ({col.field_type})
                        </span>
                      </th>
                    ))}
                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground">
                      Conf.
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr
                      key={row._doc_id}
                      className="border-b transition-colors hover:bg-muted/30"
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        <Link
                          href={`/documents/${row._doc_id}`}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <span className="max-w-[200px] truncate">
                            {row._filename}
                          </span>
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </Link>
                      </td>
                      {data.columns.map((col) => (
                        <td
                          key={col.field_name}
                          className="max-w-[250px] truncate px-4 py-3"
                          title={String(row[col.field_name] ?? "")}
                        >
                          {row[col.field_name] != null
                            ? String(row[col.field_name])
                            : "-"}
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <ConfidenceDot value={row._confidence_avg} />
                          <span className="text-xs">
                            {Math.round(row._confidence_avg * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {row._is_reviewed ? (
                          <Badge
                            variant="outline"
                            className="gap-1 text-green-600 border-green-200"
                          >
                            <CheckCircle className="h-3 w-3" />
                            Reviewed
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <span className="text-sm text-muted-foreground">
                  Showing {(page - 1) * data.limit + 1}-
                  {Math.min(page * data.limit, data.total)} of {data.total}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
