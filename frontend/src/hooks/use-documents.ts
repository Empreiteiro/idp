import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type {
  DocumentListResponse,
  DocumentDetail,
  ExtractionResult,
} from "@/lib/types";

export function useDocuments(params?: {
  status?: string;
  template_id?: number;
  page?: number;
  limit?: number;
}) {
  return useQuery<DocumentListResponse>({
    queryKey: ["documents", params],
    queryFn: async () => {
      const { data } = await api.get("/api/documents", { params });
      return data;
    },
  });
}

export function useDocument(id: number | null) {
  return useQuery<DocumentDetail>({
    queryKey: ["document", id],
    queryFn: async () => {
      const { data } = await api.get(`/api/documents/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await api.post("/api/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/documents/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useReprocessDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post(`/api/documents/${id}/reprocess`);
      return data;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["document", id] });
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useUpdateExtraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      docId,
      extracted_data,
    }: {
      docId: number;
      extracted_data: Record<string, unknown>;
    }) => {
      const { data } = await api.put(`/api/documents/${docId}/extraction`, {
        extracted_data,
      });
      return data as ExtractionResult;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["document", vars.docId] });
    },
  });
}

export function useApproveExtraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (docId: number) => {
      const { data } = await api.post(
        `/api/documents/${docId}/extraction/approve`
      );
      return data;
    },
    onSuccess: (_, docId) => {
      qc.invalidateQueries({ queryKey: ["document", docId] });
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
