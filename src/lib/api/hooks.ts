"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiError, apiClient, buildQuery, type QueryParams } from "./client";
import type { ListMeta } from "./types";

type ListState<Row> = { key: string; rows?: Row[]; meta?: ListMeta; error?: ApiError };

function toApiError(error: unknown) {
  return error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Something went wrong. Please try again.");
}

/**
 * Loads a list endpoint. `status` separates loading, error and ready so a failed request is never shown as an empty list.
 * Previous rows stay available while a new query loads.
 */
export function useResourceList<Row>(url: string, params?: QueryParams, options: { enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true;
  const query = buildQuery(params);
  const [nonce, setNonce] = useState(0);
  const key = `${url}${query}#${nonce}`;
  const [state, setState] = useState<ListState<Row>>({ key: "" });

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    apiClient
      .get<Row[]>(`${url}${query}`, undefined, { signal: controller.signal })
      .then((result) => setState({ key, rows: result.data, meta: result.meta }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ key, error: toApiError(error) });
      });
    return () => controller.abort();
  }, [enabled, url, query, key]);

  const settled = state.key === key;
  const status = !enabled ? "idle" : !settled ? "loading" : state.error ? "error" : "ready";
  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  return { rows: state.rows, meta: state.meta, status, error: settled ? state.error : undefined, refetch } as const;
}

type QueryState<T> = { key: string; data?: T; meta?: ListMeta; error?: ApiError };

/** Loads any GET endpoint. `status` tells loading, error and ready apart, and the last data stays while a new query loads. */
export function useApiQuery<T>(url: string, params?: QueryParams, options: { enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true;
  const query = buildQuery(params);
  const [nonce, setNonce] = useState(0);
  const key = `${url}${query}#${nonce}`;
  const [state, setState] = useState<QueryState<T>>({ key: "" });
  const [last, setLast] = useState<{ data?: T; meta?: ListMeta }>({});

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    apiClient
      .get<T>(`${url}${query}`, undefined, { signal: controller.signal })
      .then((result) => {
        setState({ key, data: result.data, meta: result.meta });
        setLast({ data: result.data, meta: result.meta });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ key, error: toApiError(error) });
      });
    return () => controller.abort();
  }, [enabled, url, query, key]);

  const settled = state.key === key;
  const status = !enabled ? "idle" : !settled ? "loading" : state.error ? "error" : "ready";
  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  return { data: settled && !state.error ? state.data : last.data, meta: settled && !state.error ? state.meta : last.meta, status, error: settled ? state.error : undefined, refetch } as const;
}

export type MutationOptions<Out> = {
  successMessage?: string;
  onSuccess?: (result: Out) => void;
};

/** Runs a write call with pending state, a toast, and field errors ready to map onto a form. */
export function useMutation<In, Out>(run: (input: In) => Promise<Out>, options: MutationOptions<Out> = {}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const mutate = useCallback(
    async (input: In) => {
      setPending(true);
      setError(null);
      try {
        const result = await run(input);
        if (options.successMessage) toast.success(options.successMessage);
        options.onSuccess?.(result);
        return result;
      } catch (caught) {
        const apiError = toApiError(caught);
        setError(apiError);
        if (Object.keys(apiError.fields).length === 0) toast.error(apiError.message);
        return undefined;
      } finally {
        setPending(false);
      }
    },
    [run, options],
  );

  return { mutate, pending, error, fieldErrors: error?.fields ?? {} } as const;
}
