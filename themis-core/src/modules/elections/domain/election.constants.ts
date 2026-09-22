export const CRYPTO_MECHANISM = 'SEMAPHORE' as const;
export const MULTISIG_THRESHOLD = 3;
export const MIN_OPTIONS = 2;

export const MIN_TREE_DEPTH = 4;
export const MAX_TREE_DEPTH = 20;

export const AUTHORITY_QUOTA = 5;

// 1 minuto es el minimo para que una demo no espere el cron. Cuanto mas corto
// el intervalo, menos credenciales por lote y menor el conjunto de anonimato
// que protege a cada votante.
export const MIN_CHECKPOINT_INTERVAL_MINUTES = 1;
export const MAX_CHECKPOINT_INTERVAL_MINUTES = 1440;
export const DEFAULT_CHECKPOINT_INTERVAL_MINUTES = 60;
export const MIN_RATE_LIMIT_THRESHOLD = 1;
export const MAX_RATE_LIMIT_THRESHOLD = 10000;
export const DEFAULT_RATE_LIMIT_THRESHOLD_PER_MINUTE = 50;
