import type { Row, SummaryCard } from "@/lib/admin/types";
import type { Resource } from "@/server/auth/permissions";
import type { SessionUser } from "@/server/auth/session";
import type { ListQuery } from "@/server/http/list-query";

export type ResourceContext = { user: SessionUser; ip: string };

export type ListResult = {
  rows: Row[];
  total: number;
  /** Counts per tab value, ignoring the active tab but honouring search and filters. */
  tabCounts?: Record<string, number>;
  /** Cards shown above the table, worked out from the whole screen rather than the current page. */
  summary?: SummaryCard[];
};

/**
 * One entry per admin list screen, keyed like its URL (`users/team`).
 * Permission is `<resource>:<action>`; mutations the definition does not implement are rejected with 404.
 */
export type ResourceDef = {
  key: string;
  resource: Resource;
  sortableKeys?: string[];
  list(query: ListQuery, ctx: ResourceContext): Promise<ListResult>;
  /** Full record with every form field, used to open the editor (table rows only carry list columns). */
  get?(id: string, ctx: ResourceContext): Promise<Row>;
  /** Option lists for filters and form selects that depend on database content, keyed by field key. `ctx` lets a screen limit them to what the staff member may see. */
  options?(ctx?: ResourceContext): Promise<Record<string, string[]>>;
  create?(input: unknown, ctx: ResourceContext): Promise<Row>;
  update?(id: string, input: unknown, ctx: ResourceContext): Promise<Row>;
  remove?(id: string, ctx: ResourceContext): Promise<void>;
  actions?: Record<string, (id: string, ctx: ResourceContext) => Promise<Row>>;
};
