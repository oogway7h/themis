import { MockSsoAssertionPayload } from '../../domain/mock-sso-assertion';

export function decodeAssertion(assertion: string): MockSsoAssertionPayload {
  const [payloadB64] = assertion.split('.');
  return JSON.parse(
    Buffer.from(payloadB64, 'base64url').toString('utf8'),
  ) as MockSsoAssertionPayload;
}
