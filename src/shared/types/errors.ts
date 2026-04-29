export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super(`${entity} with id "${id}" was not found`, 'NOT_FOUND');
  }
}

export class InsufficientPermissionError extends AppError {
  constructor(action: string) {
    super(`You do not have permission to ${action}`, 'INSUFFICIENT_PERMISSION');
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

export class VoidWindowExpiredError extends AppError {
  constructor() {
    super('This transaction can no longer be voided — the 5-minute window has passed', 'VOID_WINDOW_EXPIRED');
  }
}

export class DuplicateError extends AppError {
  constructor(entity: string, field: string) {
    super(`A ${entity} with this ${field} already exists`, 'DUPLICATE');
  }
}

export class DatabaseError extends AppError {
  constructor(operation: string, cause?: unknown) {
    super(`Database error during ${operation}`, 'DATABASE_ERROR');
    if (cause instanceof Error) this.cause = cause;
  }
}
