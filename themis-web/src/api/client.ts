const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'
).replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    /** `code` del cuerpo de error de themis-core ({code, message}), si vino. */
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    // La sesion viaja en una cookie httpOnly (access_token) que pone
    // themis-core en /auth/login; el navegador la adjunta solo. No hay
    // Authorization header que armar aqui.
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    // themis-core responde los errores de dominio como {code, message}; se conserva solo
    // `code` (para distinguir p. ej. dos 409 distintos) y `message` sigue siendo el de siempre.
    const body = (await response.json().catch(() => null)) as { code?: unknown } | null;
    const code = typeof body?.code === 'string' ? body.code : undefined;
    throw new ApiError(
      `El servidor respondio ${response.status}`,
      response.status,
      code,
    );
  }

  // 204 No Content (p. ej. DELETE /elections/:id) no trae cuerpo: response.json() fallaría.
  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export const apiBaseUrl = BASE_URL;
