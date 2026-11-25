export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(fields: Record<string, string>, message = "Please correct the highlighted fields.") {
    super(400, "VALIDATION_FAILED", message, fields);
  }
}

export class Unauthorized extends AppError {
  constructor(message = "Please sign in to continue.") {
    super(401, "UNAUTHORIZED", message);
  }
}

export class Forbidden extends AppError {
  constructor(message = "You do not have permission to do this.") {
    super(403, "FORBIDDEN", message);
  }
}

export class NotFound extends AppError {
  constructor(message = "Not found.") {
    super(404, "NOT_FOUND", message);
  }
}

export class Conflict extends AppError {
  constructor(message: string, fields?: Record<string, string>) {
    super(409, "CONFLICT", message, fields);
  }
}

export class BusinessRule extends AppError {
  constructor(message: string, fields?: Record<string, string>) {
    super(422, "BUSINESS_RULE", message, fields);
  }
}

export class RateLimited extends AppError {
  constructor(readonly retryAfterSeconds: number) {
    super(429, "RATE_LIMITED", "Too many requests. Please try again shortly.");
  }
}

function prismaCode(error: unknown) {
  if (error && typeof error === "object" && (error as { name?: string }).name === "PrismaClientKnownRequestError") {
    return (error as { code?: string }).code;
  }
  return undefined;
}

/** Known failures keep their message; anything else becomes a generic 500 so internals never reach the client. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const code = prismaCode(error);
  if (code === "P2002") return new Conflict("A record with these details already exists.");
  if (code === "P2025") return new NotFound();
  return new AppError(500, "INTERNAL", "Something went wrong. Please try again.");
}
