export interface ChainStatus {
  connected: boolean;
  chainId: number | null;
  blockNumber: number | null;
  relayerAddress: string | null;
  contractAddress: string | null;
  contractVersion: string | null;
  error: string | null;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  service: string;
  timestamp: string;
  dependencies: {
    database: { reachable: boolean };
    chain: ChainStatus;
    ai: { reachable: boolean; error: string | null };
  };
}

export interface PingLog {
  id: string;
  source: string;
  note: string | null;
  createdAt: string;
}

export interface PingListResponse {
  total: number;
  items: PingLog[];
}

export interface SeriesPoint {
  t: number;
  votes: number;
}

export interface ForecastResponse {
  source: 'themis-ai' | 'unavailable';
  model: string | null;
  series: SeriesPoint[];
  projection: SeriesPoint[];
  projectedTotal: number | null;
}
