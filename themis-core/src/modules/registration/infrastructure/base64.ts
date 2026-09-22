// Buffer.from(str, 'base64') devuelve, para strings chicas, una vista dentro
// del pool interno de Node con byteOffset != 0. @cloudflare/blindrsa-ts no
// respeta ese offset en algunas rutas internas (PSS verify en particular) y
// termina leyendo los bytes equivocados - una firma valida da `false`.
// Copiar a un ArrayBuffer propio con byteOffset 0 evita el bug. Ver
// debug reproducido antes de este fix: verify() daba false con bytes
// byte-a-byte identicos segun Buffer.compare, y daba true con la copia.
export function base64ToBytes(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, 'base64'));
}
