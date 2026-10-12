import { GraphQLError } from 'graphql';

/**
 * One error vocabulary for the whole server.
 *
 * UNAUTHENTICATED and FORBIDDEN deliberately keep Apollo's conventional
 * spellings: the client's silent-refresh link (client/src/lib/apollo.ts) keys
 * off the literal string UNAUTHENTICATED to decide whether to refresh the
 * access token and replay the operation. Renaming it would silently turn every
 * token expiry into a hard logout.
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  BAD_USER_INPUT = 'BAD_USER_INPUT',
}

export type ErrorDetails = Record<string, unknown> | undefined;

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public details?: ErrorDetails
  ) {
    super(message);
    this.name = new.target.name;
    Error.captureStackTrace?.(this, new.target);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super(ErrorCode.VALIDATION_ERROR, message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(ErrorCode.NOT_FOUND, message);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = 'Not authenticated') {
    super(ErrorCode.UNAUTHENTICATED, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(ErrorCode.FORBIDDEN, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super(ErrorCode.CONFLICT, message, details);
  }
}

export class BadUserInputError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super(ErrorCode.BAD_USER_INPUT, message, details);
  }
}

/**
 * Maps any thrown value onto a GraphQLError. Registered as Apollo's
 * `formatError`, so it applies to every resolver rather than only the ones
 * that remembered to wrap themselves.
 */
export function format_error(error: unknown): GraphQLError {
  // Apollo wraps anything a resolver throws in a GraphQLError and stamps it
  // INTERNAL_SERVER_ERROR before `formatError` runs, so the AppError has to be
  // unwrapped first. Without this every mapped error reaches the client as a
  // 500 — including the UNAUTHENTICATED code the client's token refresh
  // depends on.
  const unwrapped =
    error instanceof GraphQLError && error.originalError ? error.originalError : error;

  if (unwrapped instanceof AppError) {
    return new GraphQLError(unwrapped.message, {
      extensions: { code: unwrapped.code, ...(unwrapped.details && { details: unwrapped.details }) },
    });
  }

  if (error instanceof GraphQLError) {
    return error;
  }

  // Mongoose validation failures would otherwise surface as opaque 500s.
  if (unwrapped instanceof Error && unwrapped.name === 'ValidationError') {
    return new GraphQLError(unwrapped.message, {
      extensions: { code: ErrorCode.VALIDATION_ERROR },
    });
  }

  console.error('Unexpected error:', error);
  return new GraphQLError('Internal server error', {
    extensions: { code: ErrorCode.INTERNAL_ERROR },
  });
}
