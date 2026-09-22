import { createHmac, timingSafeEqual } from 'node:crypto';
import { FacultadSso, TipoUsuarioSso } from './mock-sso-user.entity';

export interface MockSsoAssertionPayload {
  sub: string;
  facultad: FacultadSso;
  tipoUsuario: TipoUsuarioSso;
  habilitado: boolean;
  iat: number;
  exp: number;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function hmacHex(payloadB64: string, secret: string): string {
  return createHmac('sha256', secret).update(payloadB64).digest('hex');
}

export function encodePayload(payload: MockSsoAssertionPayload): string {
  return base64UrlEncode(JSON.stringify(payload));
}

export function signAssertion(
  payload: MockSsoAssertionPayload,
  secret: string,
): string {
  const payloadB64 = encodePayload(payload);
  const signature = hmacHex(payloadB64, secret);
  return `${payloadB64}.${signature}`;
}

export type VerifyAssertionResult =
  | { valid: true; payload: MockSsoAssertionPayload }
  | { valid: false };

/**
 * Verifica la firma HMAC y la expiracion del token.
 * Usar para endpoints de autenticacion donde el TTL de sesion importa.
 */
export function verifyAssertion(
  assertion: string,
  secret: string,
): VerifyAssertionResult {
  const [payloadB64, signatureHex] = assertion.split('.');
  if (!payloadB64 || !signatureHex) {
    return { valid: false };
  }

  const expectedHex = hmacHex(payloadB64, secret);
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = Buffer.from(signatureHex, 'hex');

  if (
    expected.length !== actual.length ||
    !timingSafeEqual(expected, actual)
  ) {
    return { valid: false };
  }

  let payload: MockSsoAssertionPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64)) as MockSsoAssertionPayload;
  } catch {
    return { valid: false };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (payload.exp <= nowSeconds) {
    return { valid: false };
  }

  return { valid: true, payload };
}
