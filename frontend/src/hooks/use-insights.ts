import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type {
  DocumentInsight,
  InsightListResponse,
  InsightGenerateRequest,
  InsightGenerateResponse,
} from "@/lib/types";

export function useInsights(params?: {
  page?: number;
  limit?: number;
  insight_template_id?: number;
  status?: string;
  analysis_mode?: string;
}) {
  return useQuery<InsightListResponse>({
    queryKey: ["insights", params],
    queryFn: async () => {
      const { data } = await api.get("/api/insights", { params });
      return data;
    },
  });
}

export function useInsight(id: number | null) {
  return useQuery<DocumentInsight>({
    queryKey: ["insight", id],
    queryFn: async () => {
      const { data } = await api.get(`/api/insights/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useGenerateInsight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: InsightGenerateRequest) => {
      const { data } = await api.post("/api/insights/generate", body);
      return data as InsightGenerateResponse;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["insights"] }),
  });
}

export function useDeleteInsight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/insights/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["insights"] }),
  });
}

export function useRegenerateInsight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post(`/api/insights/${id}/regenerate`);
      return data as DocumentInsight;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["insights"] });
    },
  });
}
