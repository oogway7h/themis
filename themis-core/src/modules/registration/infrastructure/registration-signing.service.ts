import { webcrypto } from 'node:crypto';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { BlindRSA, RSABSSA } from '@cloudflare/blindrsa-ts';
import { APP_CONFIG } from '../../../config/configuration';
import type { AppConfig } from '../../../config/configuration';
import { base64ToBytes } from './base64';

// Envuelve @cloudflare/blindrsa-ts (RFC 9474) para firmar ciegamente el
// commitment de un votante sin verlo nunca en claro - "la oficina de
// registro sella el sobre carbón" de la analogia en diseno-consolidado.md.
@Injectable()
export class RegistrationSigningService implements OnModuleInit {
  private readonly suite: BlindRSA = RSABSSA.SHA384.PSS.Randomized();
  private privateKey!: webcrypto.CryptoKey;
  private publicKey!: webcrypto.CryptoKey;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async onModuleInit(): Promise<void> {
    const privateJwk = JSON.parse(
      this.config.registrationSigning.privateKeyJwk,
    ) as webcrypto.JsonWebKey;
    this.privateKey = await webcrypto.subtle.importKey(
      'jwk',
      privateJwk,
      { name: 'RSA-PSS', hash: 'SHA-384' },
      true,
      ['sign'],
    );

    const publicJwk = JSON.parse(
      this.config.registrationSigning.publicKeyJwk,
    ) as webcrypto.JsonWebKey;
    this.publicKey = await webcrypto.subtle.importKey(
      'jwk',
      publicJwk,
      { name: 'RSA-PSS', hash: 'SHA-384' },
      true,
      ['verify'],
    );
  }

  getPublicKeyJwk(): string {
    return this.config.registrationSigning.publicKeyJwk;
  }

  async blindSign(blindedMessageBase64: string): Promise<string> {
    const blindedMsg = base64ToBytes(blindedMessageBase64);
    const blindSignature = await this.suite.blindSign(this.privateKey, blindedMsg);
    return Buffer.from(blindSignature).toString('base64');
  }

  /**
   * Verifica una firma ya descegada (CU-05, paso "presentar credencial").
   * [preparedMessageBase64] es el mensaje que realmente se firmo - por
   * RFC 9474 (modo Randomized) es `random(32 bytes) || mensaje original`.
   */
  async verify(preparedMessageBase64: string, signatureBase64: string): Promise<boolean> {
    const preparedMessage = base64ToBytes(preparedMessageBase64);
    const signature = base64ToBytes(signatureBase64);
    return this.suite.verify(this.publicKey, signature, preparedMessage);
  }
}
