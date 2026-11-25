import type { CellValue } from "@/lib/admin/types";

const FORMULA_START = /^[=+\-@\t\r]/;

/** Quotes a cell and neutralises spreadsheet formulas (CSV injection). */
export function csvCell(value: CellValue | undefined) {
  const text = value === null || value === undefined ? "" : Array.isArray(value) ? value.join("; ") : String(value);
  const safe = FORMULA_START.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: CellValue[][]) {
  const lines = [headers, ...rows].map((line) => line.map((cell) => csvCell(cell)).join(","));
  return `\uFEFF${lines.join("\r\n")}`;
}
