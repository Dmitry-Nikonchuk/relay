export type ApiErrorResponseDto = {
  error: string;
  code?: string;
  message?: string;
  resetAt?: string;
  retryAfterSeconds?: number;
  details?: unknown;
};

type ApiErrorInit = {
  status: number;
  code: string;
  message?: string;
  resetAt?: string;
  retryAfterSeconds?: number;
  details?: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly resetAt?: string;
  readonly retryAfterSeconds?: number;
  readonly details?: unknown;

  constructor(error: string, init: ApiErrorInit) {
    super(init.message ?? error);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.resetAt = init.resetAt;
    this.retryAfterSeconds = init.retryAfterSeconds;
    this.details = init.details;
  }
}

export function toApiErrorResponse(error: ApiError): ApiErrorResponseDto {
  return {
    error: error.message || 'Request failed',
    code: error.code,
    message: error.message,
    resetAt: error.resetAt,
    retryAfterSeconds: error.retryAfterSeconds,
    details: error.details,
  };
}

export function apiErrorResponse(error: ApiError): Response {
  return Response.json(toApiErrorResponse(error), { status: error.status });
}

export function unauthorizedResponse(): Response {
  return apiErrorResponse(
    new ApiError('Unauthorized', {
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'You need to sign in to continue.',
    }),
  );
}

export function internalServerErrorResponse(): Response {
  return apiErrorResponse(
    new ApiError('Internal server error', {
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    }),
  );
}

export function invalidPayloadResponse(details: unknown): Response {
  return apiErrorResponse(
    new ApiError('Invalid payload', {
      status: 400,
      code: 'INVALID_PAYLOAD',
      message: 'Invalid payload',
      details,
    }),
  );
}
