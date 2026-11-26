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
  | { key: string; label: string; type: "thumbnail"; hidden?: boolean }
  | { key: string; label: string; type: "link"; hidden?: boolean };

export type FormField = {
  key: string;
  label: string;
  type: "text" | "email" | "tel" | "number" | "date" | "datetime-local" | "time" | "select" | "textarea" | "url" | "multiselect" | "file" | "repeat";
  options?: string[];
  required?: boolean;
  placeholder?: string;
  help?: string;
  step?: number;
  defaultValue?: string;
  showWhen?: { key: string; values: string[] };
  min?: number;
  max?: number;
  accept?: string;
  itemFields?: FormField[];
  minItems?: number;
  format?: "markdown";
  /** A file field that uploads when a file is chosen: "asset" follows the form's Asset type, or name a fixed type such as "Image". */
  upload?: string;
};

export type EditorKind = "event" | "batch" | "feedback" | "certificate";

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
  form?: { fields: FormField[]; defaults?: Record<string, CellValue>; steps?: string[]; editor?: EditorKind };
  exportable?: boolean;
  selectable?: boolean;
  configurableColumns?: boolean;
  showIndex?: boolean;
  rowActions?: Array<"edit" | "duplicate" | "archive" | "restore" | "delete" | "review" | "view" | "reset-password">;
};
