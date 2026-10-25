export type CellValue = string | number | string[] | null;
export type Row = { id: string } & Record<string, CellValue>;

export type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info" | "gold";

export type Column =
  | { key: string; label: string; type?: "text"; sortable?: boolean; hidden?: boolean }
  | { key: string; label: string; type: "primary"; subKey?: string; sortable?: boolean; hidden?: boolean }
  | { key: string; label: string; type: "badge"; tones?: Record<string, Tone>; sortable?: boolean; hidden?: boolean }
  | { key: string; label: string; type: "date" | "datetime"; sortable?: boolean; hidden?: boolean }
  | { key: string; label: string; type: "currency" | "number" | "percent"; sortable?: boolean; hidden?: boolean }
  | { key: string; label: string; type: "progress"; sortable?: boolean; hidden?: boolean }
  | { key: string; label: string; type: "tags"; hidden?: boolean }
  | { key: string; label: string; type: "thumbnail"; hidden?: boolean };

export type FormField = {
  key: string;
  label: string;
  type: "text" | "email" | "tel" | "number" | "date" | "datetime-local" | "time" | "select" | "textarea" | "url";
  options?: string[];
  required?: boolean;
  placeholder?: string;
  help?: string;
};

export type SummaryCard = { label: string; value: string; hint?: string; tone?: Tone };

export type ListConfig = {
  title: string;
  description: string;
  entityName: string;
  columns: Column[];
  rows: Row[];
  searchKeys?: string[];
  searchPlaceholder?: string;
  tabs?: { key: string; items: Array<{ label: string; value?: string }> };
  filters?: Array<{ key: string; label: string; options?: string[] }>;
  dateFilterKey?: string;
  summary?: SummaryCard[];
  primaryAction?: string;
  form?: { fields: FormField[]; defaults?: Record<string, CellValue> };
  exportable?: boolean;
  selectable?: boolean;
  configurableColumns?: boolean;
  showIndex?: boolean;
  rowActions?: Array<"edit" | "duplicate" | "archive" | "delete" | "review" | "view">;
};
