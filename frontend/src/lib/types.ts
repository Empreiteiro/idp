export interface TableColumnDefinition {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "currency" | "boolean";
}

export interface TemplateField {
  id: number;
  template_id: number;
  field_name: string;
  field_label: string;
  field_type: "text" | "number" | "date" | "currency" | "boolean" | "table";
  required: boolean;
  sort_order: number;
  columns?: TableColumnDefinition[] | null;
}

export interface Template {
  id: number;
  name: string;
  description: string | null;
  example_file: string | null;
  created_at: string;
  updated_at: string;
  fields: TemplateField[];
  document_count: number;
}

export interface TemplateListItem {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  field_count: number;
  document_count: number;
}

export interface Document {
  id: number;
  filename: string;
  file_path: string;
  file_type: string;
  file_size: number | null;
  template_id: number | null;
  template_name: string | null;
  status: string;
  classification_confidence: number | null;
  error_message: string | null;
  page_count: number | null;
  created_at: string;
  updated_at: string;
}

export type TableRowValue = Record<string, string | number | boolean | null>;

export interface FieldValue {
  value: string | number | boolean | null | TableRowValue[];
  confidence: number;
  original_value: string | number | boolean | null | TableRowValue[];
  corrected: boolean;
}

export interface ExtractionResult {
  id: number;
  document_id: number;
  template_id: number;
  extracted_data: Record<string, FieldValue>;
  is_reviewed: boolean;
  reviewed_at: string | null;
  created_at: string;
}

export interface DocumentDetail extends Document {
  extraction: ExtractionResult | null;
}

export interface DocumentListResponse {
  documents: Document[];
  total: number;
  page: number;
  limit: number;
}

export interface DashboardStats {
  total_documents: number;
  total_templates: number;
  documents_by_status: Record<string, number>;
  reviewed: number;
  pending_review: number;
  failed: number;
  processing: number;
}

export interface RecentDocument {
  id: number;
  filename: string;
  status: string;
  template_name: string | null;
  created_at: string;
}

export interface AppSettings {
  settings: Record<string, string>;
}

// Data Tables types
export interface DataTableColumn {
  field_name: string;
  field_label: string;
  field_type: string;
}

export interface DataTableRow {
  _extraction_id: number;
  _doc_id: number;
  _filename: string;
  _status: string;
  _is_reviewed: boolean;
  _created_at: string;
  _confidence_avg: number;
  [key: string]: string | number | boolean | null;
}

export interface DataTableResponse {
  template_id: number;
  template_name: string;
  columns: DataTableColumn[];
  rows: DataTableRow[];
  total: number;
  page: number;
  limit: number;
}

export interface DataSummaryItem {
  template_id: number;
  template_name: string;
  field_count: number;
  extraction_count: number;
  reviewed_count: number;
  pending_count: number;
}

export interface DataSummaryResponse {
  templates: DataSummaryItem[];
}

export interface BatchUploadResult {
  total: number;
  succeeded: number;
  failed: number;
  results: Array<{
    id?: number;
    filename: string;
    status: string;
    error?: string;
  }>;
}

export interface SystemInfo {
  libraries: Record<string, boolean>;
}

export interface DepStatus {
  name: string;
  required: boolean;
  installed: boolean;
  version: string;
  detail: string;
}

export interface DepsValidationResult {
  ok: boolean;
  python_packages: DepStatus[];
  system_tools: DepStatus[];
  summary: string;
}

export interface ConnectionTestResult {
  status: "ok" | "error";
  message: string;
  response?: string;
}

export interface ProviderConfig {
  id: number;
  kind: "ai" | "ocr";
  provider_name: string;
  display_name: string;
  api_key: string; // masked
  has_key: boolean;
  model: string;
  is_default: boolean;
  is_active: boolean;
  extra_config: Record<string, string>;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProvidersResponse {
  providers: ProviderConfig[];
  available_models: Record<string, string[]>;
}

// LLM Logs types
export interface LLMLogEntry {
  id: number;
  request_type: string;
  provider: string;
  model: string;
  document_id: number | null;
  template_id: number | null;
  entity_name: string | null;
  status: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  latency_ms: number | null;
  estimated_cost: number | null;
  created_at: string;
}

export interface LLMLogDetail extends LLMLogEntry {
  system_prompt: string | null;
  user_prompt: string | null;
  response_text: string | null;
  error_message: string | null;
}

export interface LLMLogListResponse {
  logs: LLMLogEntry[];
  total: number;
  page: number;
  limit: number;
}

// Insight Templates types
export interface InsightTemplateSection {
  id: number;
  insight_template_id: number;
  title: string;
  description: string | null;
  prompt_hint: string | null;
  sort_order: number;
  created_at: string;
}

export interface InsightTemplate {
  id: number;
  name: string;
  description: string | null;
  template_id: number;
  template_name: string;
  system_prompt: string | null;
  is_active: boolean;
  sections: InsightTemplateSection[];
  insight_count: number;
  created_at: string;
  updated_at: string;
}

export interface InsightTemplateListItem {
  id: number;
  name: string;
  description: string | null;
  template_name: string;
  section_count: number;
  insight_count: number;
  is_active: boolean;
  created_at: string;
}

// Document Insights types
export interface InsightDocumentRef {
  document_id: number;
  filename: string;
  template_name: string | null;
}

export interface DocumentInsight {
  id: number;
  insight_template_id: number | null;
  insight_template_name: string | null;
  analysis_mode: string;
  title: string;
  content: string | null;
  summary: string | null;
  status: string;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  documents: InsightDocumentRef[];
  created_at: string;
  updated_at: string;
}

export interface DocumentInsightListItem {
  id: number;
  title: string;
  insight_template_name: string | null;
  analysis_mode: string;
  document_count: number;
  status: string;
  created_at: string;
}

export interface InsightListResponse {
  insights: DocumentInsightListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface InsightGenerateRequest {
  insight_template_id: number;
  document_ids: number[];
  analysis_mode: "individual" | "consolidated";
  custom_instructions?: string;
}

export interface InsightGenerateResponse {
  insights: DocumentInsight[];
  total_tokens: number;
  total_cost: number;
  total_latency_ms: number;
}

export interface LLMStats {
  total_requests: number;
  total_tokens: number;
  total_cost: number;
  avg_latency_ms: number;
  error_count: number;
  success_rate: number;
  by_provider: Record<string, number>;
  by_type: Record<string, number>;
  by_model: Record<string, number>;
  tokens_by_provider: Record<string, number>;
  cost_by_provider: Record<string, number>;
}
