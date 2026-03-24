import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { DashboardStats, RecentDocument } from "@/lib/types";

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard", "stats"],
    queryFn: async () => {
      const { data } = await api.get("/api/dashboard/stats");
      return data;
    },
    refetchInterval: 10000,
  });
}

export function useRecentDocuments(limit = 10) {
  return useQuery<RecentDocument[]>({
    queryKey: ["dashboard", "recent", limit],
    queryFn: async () => {
      const { data } = await api.get("/api/dashboard/recent", {
        params: { limit },
      });
      return data;
    },
    refetchInterval: 10000,
  });
}
