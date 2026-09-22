import { webcrypto } from 'node:crypto';
import { RSABSSA } from '@cloudflare/blindrsa-ts';

// Genera la clave RSA-PSS de firma ciega de registro (CU-05, "la oficina de
// registro" firma el sobre cegado). Correr una sola vez por entorno y pegar
// el resultado en .env - no se commitea. Ver docs/modelo-bd-registro.md.
async function main(): Promise<void> {
  const suite = RSABSSA.SHA384.PSS.Randomized();
  const { privateKey, publicKey } = await suite.generateKey({
    publicExponent: Uint8Array.from([1, 0, 1]),
    modulusLength: 2048,
  });

  const subtle = (webcrypto as unknown as Crypto).subtle;
  const privateJwk = await subtle.exportKey('jwk', privateKey);
  const publicJwk = await subtle.exportKey('jwk', publicKey);

  console.log('Pega estas dos lineas en tu .env:\n');
  console.log(`REGISTRATION_SIGNING_PRIVATE_KEY_JWK=${JSON.stringify(privateJwk)}`);
  console.log(`REGISTRATION_SIGNING_PUBLIC_KEY_JWK=${JSON.stringify(publicJwk)}`);
}

void main();
