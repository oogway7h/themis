export class Option {
  constructor(
    public readonly id: string,
    public readonly electionId: string,
    public readonly nombre: string,
    public readonly descripcion: string | null,
    // CU-10: valor 0..N-1 usado como `message` de Semaphore (Option.id es un
    // UUID, no sirve como uint256 en el contrato).
    public readonly onChainIndex: number,
    public readonly createdAt: Date,
  ) {}
}
