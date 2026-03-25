import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type {
  InsightTemplate,
  InsightTemplateListItem,
  InsightTemplateSection,
} from "@/lib/types";

export function useInsightTemplates() {
  return useQuery<InsightTemplateListItem[]>({
    queryKey: ["insight-templates"],
    queryFn: async () => {
      const { data } = await api.get("/api/insight-templates");
      return data;
    },
  });
}

export function useInsightTemplate(id: number | null) {
  return useQuery<InsightTemplate>({
    queryKey: ["insight-template", id],
    queryFn: async () => {
      const { data } = await api.get(`/api/insight-templates/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateInsightTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      name: string;
      description?: string;
      template_id: number;
      system_prompt?: string;
    }) => {
      const { data } = await api.post("/api/insight-templates", body);
      return data as InsightTemplate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["insight-templates"] }),
  });
}

export function useUpdateInsightTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: number;
      name?: string;
      description?: string;
      system_prompt?: string;
      is_active?: boolean;
    }) => {
      const { data } = await api.put(`/api/insight-templates/${id}`, body);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["insight-templates"] });
      qc.invalidateQueries({ queryKey: ["insight-template", vars.id] });
    },
  });
}

export function useDeleteInsightTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/insight-templates/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["insight-templates"] }),
  });
}

export function useSuggestSections() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (insightTemplateId: number) => {
      const { data } = await api.post(
        `/api/insight-templates/${insightTemplateId}/suggest-sections`
      );
      return data as InsightTemplateSection[];
    },
    onSuccess: (_, id) =>
      qc.invalidateQueries({ queryKey: ["insight-template", id] }),
  });
}

export function useAddSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      insightTemplateId,
      ...body
    }: {
      insightTemplateId: number;
      title: string;
      description?: string;
      prompt_hint?: string;
      sort_order?: number;
    }) => {
      const { data } = await api.post(
        `/api/insight-templates/${insightTemplateId}/sections`,
        body
      );
      return data;
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({
        queryKey: ["insight-template", vars.insightTemplateId],
      }),
  });
}

export function useUpdateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      insightTemplateId,
      sectionId,
      ...body
    }: {
      insightTemplateId: number;
      sectionId: number;
      title?: string;
      description?: string;
      prompt_hint?: string;
      sort_order?: number;
    }) => {
      const { data } = await api.put(
        `/api/insight-templates/${insightTemplateId}/sections/${sectionId}`,
        body
      );
      return data;
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({
        queryKey: ["insight-template", vars.insightTemplateId],
      }),
  });
}

export function useDeleteSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      insightTemplateId,
      sectionId,
    }: {
      insightTemplateId: number;
      sectionId: number;
    }) => {
      await api.delete(
        `/api/insight-templates/${insightTemplateId}/sections/${sectionId}`
      );
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({
        queryKey: ["insight-template", vars.insightTemplateId],
      }),
  });
}
