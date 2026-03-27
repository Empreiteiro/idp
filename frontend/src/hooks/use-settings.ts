import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type {
  AppSettings,
  ConnectionTestResult,
  ProvidersResponse,
  ProviderConfig,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Global settings (legacy key-value)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Provider configuration
// ---------------------------------------------------------------------------

export function useProviders() {
  return useQuery<ProvidersResponse>({
    queryKey: ["providers"],
    queryFn: async () => {
      const { data } = await api.get("/api/settings/providers");
      return data;
    },
  });
}

export function useCreateProvider() {
  const qc = useQueryClient();
  return useMutation<ProviderConfig, Error, {
    kind: string;
    provider_name: string;
    display_name?: string;
    api_key?: string;
    model?: string;
    is_default?: boolean;
    extra_config?: Record<string, string>;
  }>({
    mutationFn: async (body) => {
      const { data } = await api.post("/api/settings/providers", body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["providers"] }),
  });
}

export function useUpdateProvider() {
  const qc = useQueryClient();
  return useMutation<ProviderConfig, Error, {
    id: number;
    display_name?: string;
    api_key?: string;
    model?: string;
    is_default?: boolean;
    is_active?: boolean;
    extra_config?: Record<string, string>;
  }>({
    mutationFn: async ({ id, ...body }) => {
      const { data } = await api.put(`/api/settings/providers/${id}`, body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["providers"] }),
  });
}

export function useDeleteProvider() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await api.delete(`/api/settings/providers/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["providers"] }),
  });
}

export function useSetDefaultProvider() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await api.post(`/api/settings/providers/${id}/set-default`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["providers"] }),
  });
}

export function useTestProvider() {
  return useMutation<ConnectionTestResult, Error, number>({
    mutationFn: async (id) => {
      const { data } = await api.post(`/api/settings/providers/${id}/test`);
      return data;
    },
  });
}
