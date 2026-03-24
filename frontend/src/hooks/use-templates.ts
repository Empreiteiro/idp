import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Template, TemplateListItem, TemplateField } from "@/lib/types";

export function useTemplates() {
  return useQuery<TemplateListItem[]>({
    queryKey: ["templates"],
    queryFn: async () => {
      const { data } = await api.get("/api/templates");
      return data;
    },
  });
}

export function useTemplate(id: number | null) {
  return useQuery<Template>({
    queryKey: ["template", id],
    queryFn: async () => {
      const { data } = await api.get(`/api/templates/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await api.post("/api/templates", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data as Template;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: number;
      name?: string;
      description?: string;
    }) => {
      const { data } = await api.put(`/api/templates/${id}`, body);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      qc.invalidateQueries({ queryKey: ["template", vars.id] });
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/templates/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useSuggestFields() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (templateId: number) => {
      const { data } = await api.post(
        `/api/templates/${templateId}/suggest-fields`
      );
      return data as TemplateField[];
    },
    onSuccess: (_, templateId) =>
      qc.invalidateQueries({ queryKey: ["template", templateId] }),
  });
}

export function useAddField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      templateId,
      ...body
    }: {
      templateId: number;
      field_name: string;
      field_label: string;
      field_type: string;
      required: boolean;
    }) => {
      const { data } = await api.post(
        `/api/templates/${templateId}/fields`,
        body
      );
      return data;
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["template", vars.templateId] }),
  });
}

export function useUpdateField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      templateId,
      fieldId,
      ...body
    }: {
      templateId: number;
      fieldId: number;
      field_name?: string;
      field_label?: string;
      field_type?: string;
      required?: boolean;
      sort_order?: number;
    }) => {
      const { data } = await api.put(
        `/api/templates/${templateId}/fields/${fieldId}`,
        body
      );
      return data;
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["template", vars.templateId] }),
  });
}

export function useDeleteField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      templateId,
      fieldId,
    }: {
      templateId: number;
      fieldId: number;
    }) => {
      await api.delete(`/api/templates/${templateId}/fields/${fieldId}`);
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["template", vars.templateId] }),
  });
}
