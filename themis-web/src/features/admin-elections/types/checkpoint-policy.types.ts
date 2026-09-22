// Contrato TS a mano, siguiendo themis-core/src/modules/elections/election.contract.json.
// TODO: reemplazar por tipos generados cuando se instale openapi-typescript.

export interface CheckpointPolicyDto {
  checkpointIntervalMinutes: number;
  rateLimitThresholdPerMinute: number;
  esValorPorDefecto: boolean;
}

export interface ConfigureCheckpointPolicyRequest {
  checkpointIntervalMinutes: number;
  rateLimitThresholdPerMinute: number;
}
