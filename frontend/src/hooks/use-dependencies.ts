import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface DepStatus {
  name: string;
  required: boolean;
  installed: boolean;
  version: string;
  detail: string;
}

export interface OsInfo {
  os: string;
  os_display: string;
  arch: string;
  python: string;
}

export interface DepsListResult {
  ok: boolean;
  python_packages: DepStatus[];
  system_tools: DepStatus[];
  summary: string;
  os_info: OsInfo;
}

export interface InstallResult {
  status: string;
  message: string;
  output: string;
}

export function useDependencies() {
  return useQuery<DepsListResult>({
    queryKey: ["dependencies"],
    queryFn: async () => {
      const { data } = await api.get("/api/dependencies");
      return data;
    },
  });
}

export function useInstallDependency() {
  const qc = useQueryClient();
  return useMutation<InstallResult, Error, { name: string; type: string }>({
    mutationFn: async (body) => {
      const { data } = await api.post("/api/dependencies/install", body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dependencies"] });
      qc.invalidateQueries({ queryKey: ["validate-deps"] });
      qc.invalidateQueries({ queryKey: ["system-info"] });
    },
  });
}
