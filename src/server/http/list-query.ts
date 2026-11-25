import { ValidationError } from "./errors";

export type ListQuery = {
  q: string;
  tab?: string;
  filters: Record<string, string>;
  from?: string;
  to?: string;
  sort?: { key: string; dir: "asc" | "desc" };
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

export type ListQueryOptions = {
  /** When set, `sort` must be one of these keys. */
  sortableKeys?: string[];
  defaultPageSize?: number;
  maxPageSize?: number;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value: string) {
  if (!DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function positiveInt(value: string | null, fallback: number, field: string) {
  if (value === null || value === "") return fallback;
  if (!/^\d+$/.test(value) || Number(value) < 1) throw new ValidationError({ [field]: "Must be a positive whole number." });
  return Number(value);
}

/** Parses the shared list contract: q, tab, filter.<key>, from, to, sort, dir, page, pageSize. */
export function parseListQuery(params: URLSearchParams, options: ListQueryOptions = {}): ListQuery {
  const maxPageSize = options.maxPageSize ?? 100;
  const defaultPageSize = Math.min(options.defaultPageSize ?? 25, maxPageSize);

  const q = (params.get("q") ?? "").trim().slice(0, 100);
  const tab = params.get("tab")?.trim() || undefined;

  const filters: Record<string, string> = {};
  for (const [name, value] of params) {
    if (!name.startsWith("filter.")) continue;
    const key = name.slice("filter.".length);
    if (!/^[A-Za-z][A-Za-z0-9_]{0,40}$/.test(key)) throw new ValidationError({ [name]: "Unknown filter." });
    if (value.trim()) filters[key] = value.trim().slice(0, 200);
  }

  const from = params.get("from") || undefined;
  const to = params.get("to") || undefined;
  if (from && !validDate(from)) throw new ValidationError({ from: "Use YYYY-MM-DD." });
  if (to && !validDate(to)) throw new ValidationError({ to: "Use YYYY-MM-DD." });
  if (from && to && from > to) throw new ValidationError({ to: "End date must not be before the start date." });

  let sort: ListQuery["sort"];
  const sortKey = params.get("sort");
  if (sortKey) {
    if (options.sortableKeys && !options.sortableKeys.includes(sortKey)) {
      throw new ValidationError({ sort: "Cannot sort by this column." });
    }
    const dir = params.get("dir") ?? "asc";
    if (dir !== "asc" && dir !== "desc") throw new ValidationError({ dir: "Use asc or desc." });
    sort = { key: sortKey, dir };
  }

  const page = positiveInt(params.get("page"), 1, "page");
  const pageSize = Math.min(positiveInt(params.get("pageSize"), defaultPageSize, "pageSize"), maxPageSize);

  return { q, tab, filters, from, to, sort, page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
