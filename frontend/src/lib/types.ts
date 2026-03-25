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
