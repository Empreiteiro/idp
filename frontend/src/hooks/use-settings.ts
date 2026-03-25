import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { AppSettings, SystemInfo, ConnectionTestResult, DepsValidationResult } from "@/lib/types";

export function useSettings() {
  return useQuery<AppSettings>({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await api.get("/api/settings");
      return data;
    },
  });
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      await api.put("/api/settings", { key, value });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}

export function useSystemInfo() {
  return useQuery<SystemInfo>({
    queryKey: ["system-info"],
    queryFn: async () => {
      const { data } = await api.get("/api/settings/system-info");
      return data;
    },
  });
}

export function useValidateDeps() {
  return useQuery<DepsValidationResult>({
    queryKey: ["validate-deps"],
    queryFn: async () => {
      const { data } = await api.get("/api/settings/validate-deps");
      return data;
    },
  });
}

export function useTestAI() {
  return useMutation<ConnectionTestResult>({
    mutationFn: async () => {
      const { data } = await api.post("/api/settings/test-ai");
      return data;
    },
  });
}

export function useTestOCR() {
  return useMutation<ConnectionTestResult>({
    mutationFn: async () => {
      const { data } = await api.post("/api/settings/test-ocr");
      return data;
    },
  });
}
