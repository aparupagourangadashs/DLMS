import type { z } from "zod";
import { ValidationError } from "./errors";

const MAX_BODY_BYTES = 1_000_000;

export function fieldErrors(issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>) {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "_";
    fields[key] ??= issue.message;
  }
  return fields;
}

export function parseWith<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw new ValidationError(fieldErrors(result.error.issues));
  return result.data;
}

export async function readJson(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) throw new ValidationError({ _: "Request body is too large." });
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new ValidationError({ _: "Request body is too large." });
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new ValidationError({ _: "Request body must be valid JSON." });
  }
}

export async function parseJsonBody<S extends z.ZodType>(request: Request, schema: S): Promise<z.output<S>> {
  return parseWith(schema, await readJson(request));
}
