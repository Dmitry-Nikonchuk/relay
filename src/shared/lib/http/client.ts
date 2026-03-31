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
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
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
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
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
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
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
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
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
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
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

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response;
  },
};
