import type { ApiErrorResponseDto } from '@/shared/lib/api/errors';

export class HttpError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly resetAt?: string;
  readonly retryAfterSeconds?: number;
  readonly details?: unknown;

  constructor(
    message: string,
    init: {
      status: number;
      code?: string;
      resetAt?: string;
      retryAfterSeconds?: number;
      details?: unknown;
    },
  ) {
    super(message);
    this.name = 'HttpError';
    this.status = init.status;
    this.code = init.code;
    this.resetAt = init.resetAt;
    this.retryAfterSeconds = init.retryAfterSeconds;
    this.details = init.details;
  }
}

async function throwIfNotOk(response: Response): Promise<void> {
  if (response.ok) {
    return;
  }

  const body = await response
    .json()
    .then((payload) => payload as ApiErrorResponseDto)
    .catch(() => null);

  throw new HttpError(body?.message || body?.error || `HTTP error! status: ${response.status}`, {
    status: response.status,
    code: body?.code,
    resetAt: body?.resetAt,
    retryAfterSeconds: body?.retryAfterSeconds,
    details: body?.details,
  });
}

export const httpClient = {
  async get<T>(input: RequestInfo | URL, options?: RequestInit): Promise<T> {
    const response = await fetch(input, {
      ...options,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    await throwIfNotOk(response);
    return response.json() as T;
  },

  async post<T>(input: RequestInfo | URL, options?: RequestInit): Promise<T> {
    const response = await fetch(input, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    await throwIfNotOk(response);
    return response.json() as T;
  },

  async put<T>(input: RequestInfo | URL, options?: RequestInit): Promise<T> {
    const response = await fetch(input, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    await throwIfNotOk(response);
    return response.json() as T;
  },

  async patch<T>(input: RequestInfo | URL, options?: RequestInit): Promise<T> {
    const response = await fetch(input, {
      ...options,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    await throwIfNotOk(response);
    return response.json() as T;
  },

  async delete<T>(input: RequestInfo | URL, options?: RequestInit): Promise<T> {
    const response = await fetch(input, {
      ...options,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    await throwIfNotOk(response);
    return response.json() as T;
  },

  async stream(input: RequestInfo | URL, options?: RequestInit): Promise<Response> {
    const response = await fetch(input, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    await throwIfNotOk(response);

    return response;
  },
};
