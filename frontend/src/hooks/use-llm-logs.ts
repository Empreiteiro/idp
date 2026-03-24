import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { LLMLogListResponse, LLMLogDetail, LLMStats } from "@/lib/types";

export function useLLMLogs(params?: {
  page?: number;
  limit?: number;
  request_type?: string;
  provider?: string;
  status?: string;
  document_id?: number;
  template_id?: number;
}) {
  return useQuery<LLMLogListResponse>({
    queryKey: ["llm-logs", params],
    queryFn: async () => {
      const { data } = await api.get("/api/llm-logs", { params });
      return data;
    },
  });
}

export function useLLMLogDetail(id: number | null) {
  return useQuery<LLMLogDetail>({
    queryKey: ["llm-log", id],
    queryFn: async () => {
      const { data } = await api.get(`/api/llm-logs/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useLLMStats() {
  return useQuery<LLMStats>({
    queryKey: ["llm-stats"],
    queryFn: async () => {
      const { data } = await api.get("/api/llm-logs/stats");
      return data;
    },
  });
}
