import 'server-only';

import { DEBUG_ERRORS } from './env';

/**
 * The API error/success contract.
 *
 * Ported from the Express backend's utilities/errorHandler.js. The response
 * shapes are reproduced exactly — the frontend reads `success`, `message`,
 * `data` and `error.type` — so this file must stay behaviour-compatible.
 *
 * What did NOT come across:
 *   - `errorHandler(err, req, res, next)`, the terminal Express middleware.
 *     withApi() catches and formats instead.
 *   - the real `asyncHandler`. See the note on it below.
 */

export const ERROR_TYPES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
};

export const STATUS_CODES = {
  [ERROR_TYPES.VALIDATION_ERROR]: 400,
  [ERROR_TYPES.AUTHENTICATION_ERROR]: 401,
  [ERROR_TYPES.AUTHORIZATION_ERROR]: 403,
  [ERROR_TYPES.NOT_FOUND_ERROR]: 404,
  [ERROR_TYPES.CONFLICT_ERROR]: 409,
  [ERROR_TYPES.EXTERNAL_SERVICE_ERROR]: 502,
  [ERROR_TYPES.INTERNAL_SERVER_ERROR]: 500,
  [ERROR_TYPES.FILE_UPLOAD_ERROR]: 400,
  [ERROR_TYPES.DATABASE_ERROR]: 500,
};

export class AppError extends Error {
  constructor(message, type, statusCode, details = null) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.statusCode = statusCode || STATUS_CODES[type] || 500;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true;
  }
}

export const createErrorResponse = (error, includeStack = false) => {
  const response = {
    success: false,
    error: {
      type: error.type || ERROR_TYPES.INTERNAL_SERVER_ERROR,
      message: error.message || 'An unexpected error occurred',
      timestamp: error.timestamp || new Date().toISOString(),
      statusCode: error.statusCode || 500,
    },
  };

  if (error.details) {
    response.error.details = error.details;
  }

  if (includeStack && DEBUG_ERRORS) {
    response.error.stack = error.stack;
  }

  return response;
};

export const createSuccessResponse = (message, data = null, statusCode = 200) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    statusCode,
  };

  if (data !== null) {
    response.data = data;
  }

  return response;
};

/**
 * Identity function, kept only so the ported controllers compile unchanged.
 *
 * In Express this wrapped a handler so that a rejected promise reached the error
 * middleware via next(). withApi() owns that responsibility now: it awaits the
 * handler inside a try/catch. Roughly 90 controller exports are declared as
 * `asyncHandler(async (req, res) => ...)`, and rewriting all of them to prove a
 * point would be churn for its own sake.
 */
export const asyncHandler = (fn) => fn;

export const createValidationError = (message, details = null) =>
  new AppError(message, ERROR_TYPES.VALIDATION_ERROR, 400, details);

export const createAuthError = (message = 'Authentication failed') =>
  new AppError(message, ERROR_TYPES.AUTHENTICATION_ERROR, 401);

export const createAuthorizationError = (message = 'Not authorized to perform this action') =>
  new AppError(message, ERROR_TYPES.AUTHORIZATION_ERROR, 403);

export const createNotFoundError = (resource = 'Resource') =>
  new AppError(`${resource} not found`, ERROR_TYPES.NOT_FOUND_ERROR, 404);

export const createConflictError = (message = 'Resource already exists') =>
  new AppError(message, ERROR_TYPES.CONFLICT_ERROR, 409);

export const createDatabaseError = (operation, originalError, functionName = null) => {
  const context = functionName ? `${functionName}: ${operation}` : operation;
  console.error(`Database error during ${context}:`, {
    function: functionName,
    operation,
    error: originalError?.message ?? String(originalError ?? ''),
    stack: originalError?.stack,
    timestamp: new Date().toISOString(),
  });
  // Deliberately generic: the caller must not leak driver-level detail.
  return new AppError(
    `Database operation failed: ${operation}`,
    ERROR_TYPES.DATABASE_ERROR,
    500
  );
};

/**
 * Several call sites invoke this with a single pre-formatted string, e.g.
 * `createExternalServiceError('Supabase update failed: ...')`, which in the
 * original rendered as "External service error: <string> undefined failed".
 * Treat the one-argument form as a complete message rather than fixing ten
 * call sites during a mechanical port.
 */
export const createExternalServiceError = (
  service,
  operation,
  originalError,
  functionName = null
) => {
  if (operation === undefined && originalError === undefined) {
    console.error(`External service error: ${service}`);
    return new AppError(service, ERROR_TYPES.EXTERNAL_SERVICE_ERROR, 502);
  }

  const context = functionName
    ? `${functionName}: ${service} ${operation}`
    : `${service} ${operation}`;
  console.error(`External service error during ${context}:`, {
    function: functionName,
    service,
    operation,
    error: originalError?.message ?? String(originalError ?? ''),
    stack: originalError?.stack,
    timestamp: new Date().toISOString(),
  });
  return new AppError(
    `External service error: ${service} ${operation} failed`,
    ERROR_TYPES.EXTERNAL_SERVICE_ERROR,
    502
  );
};
