export interface ValidationIssue {
  field: string;
  errors: string[];
}

export class HttpError extends Error {
  status: number;
  errors?: ValidationIssue[];

  constructor(status: number, message: string, options?: { errors?: ValidationIssue[] }) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.errors = options?.errors;
  }
}

export function createValidationError(issues: ValidationIssue[]) {
  return new HttpError(400, "Validation failed", { errors: issues });
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}
