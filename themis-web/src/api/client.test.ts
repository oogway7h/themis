import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from './client';

describe('api client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubFetch(response: Response) {
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  it('resuelve undefined con 204 No Content, sin intentar parsear JSON (DELETE /elections/:id)', async () => {
    const fetchMock = stubFetch(new Response(null, { status: 204 }));

    await expect(api.delete<void>('/elections/abc')).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/elections\/abc$/);
    expect(init).toMatchObject({ method: 'DELETE', credentials: 'include' });
  });

  it('parsea el cuerpo JSON en respuestas 200', async () => {
    stubFetch(
      new Response(JSON.stringify({ id: '1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(api.get<{ id: string }>('/elections/1')).resolves.toEqual({ id: '1' });
  });

  it('lanza ApiError con el status en respuestas no exitosas', async () => {
    stubFetch(new Response(JSON.stringify({ code: 'ELECTION_NOT_EDITABLE' }), { status: 409 }));

    const error = await api.delete<void>('/elections/abc').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(409);
  });

  it('expone el code del cuerpo de error de themis-core en ApiError.code', async () => {
    stubFetch(
      new Response(JSON.stringify({ code: 'BATCH_ALREADY_APPROVED_BY_AUTHORITY', message: 'x' }), {
        status: 409,
      }),
    );

    const error = await api.post<void>('/elections/e/batches/b/approvals').catch((e: unknown) => e);

    expect((error as ApiError).code).toBe('BATCH_ALREADY_APPROVED_BY_AUTHORITY');
    expect((error as ApiError).message).toBe('El servidor respondio 409');
  });

  it('deja code en undefined si el cuerpo de error no es JSON', async () => {
    stubFetch(new Response('Bad Gateway', { status: 502 }));

    const error = await api.get<void>('/health').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(502);
    expect((error as ApiError).code).toBeUndefined();
  });
});
