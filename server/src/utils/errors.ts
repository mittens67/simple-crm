import { GraphQLError } from 'graphql';

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  BAD_USER_INPUT = 'BAD_USER_INPUT',
}

export interface ErrorResponse {
  code: ErrorCode;
  message: string;
  details?: any;
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(ErrorCode.VALIDATION_ERROR, message, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(ErrorCode.NOT_FOUND, message);
    this.name = 'NotFoundError';
  }
}

export class PermissionError extends AppError {
  constructor(message: string) {
    super(ErrorCode.PERMISSION_DENIED, message);
    this.name = 'PermissionError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(ErrorCode.CONFLICT, message, details);
    this.name = 'ConflictError';
  }
}

export function format_error(error: any): GraphQLError {
  if (error instanceof AppError) {
    return new GraphQLError(error.message, {
      extensions: {
        code: error.code,
        details: error.details,
      },
    });
  }

  if (error instanceof GraphQLError) {
    return error;
  }

  console.error('Unexpected error:', error);
  return new GraphQLError('Internal server error', {
    extensions: {
      code: ErrorCode.INTERNAL_ERROR,
    },
  });
}
