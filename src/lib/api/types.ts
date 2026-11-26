import type { SummaryCard } from "@/lib/admin/types";

export type ListMeta = { page: number; pageSize: number; total: number; tabCounts?: Record<string, number>; summary?: SummaryCard[] };

export type ApiSuccess<T> = { data: T; meta?: ListMeta };

export type ApiErrorBody = {
  error: { code: string; message: string; fields?: Record<string, string> };
};
