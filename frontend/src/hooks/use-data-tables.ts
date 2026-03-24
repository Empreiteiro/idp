import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { DataTableResponse, DataSummaryResponse } from "@/lib/types";

export function useDataTable(
  templateId: number | null,
  params?: {
    page?: number;
    limit?: number;
    reviewed_only?: boolean;
    search?: string;
  }
) {
  return useQuery<DataTableResponse>({
    queryKey: ["data-table", templateId, params],
    queryFn: async () => {
      const { data } = await api.get(
        `/api/data/templates/${templateId}/table`,
        { params }
      );
      return data;
    },
    enabled: !!templateId,
  });
}

export function useDataSummary() {
  return useQuery<DataSummaryResponse>({
    queryKey: ["data-summary"],
    queryFn: async () => {
      const { data } = await api.get("/api/data/summary");
      return data;
    },
  });
}

export function exportTemplateCSV(templateId: number, reviewedOnly = false) {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const url = `${baseUrl}/api/data/templates/${templateId}/export?reviewed_only=${reviewedOnly}`;
  window.open(url, "_blank");
}
