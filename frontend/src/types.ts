export type RequestRow = {
  n: number;
  id: string;
  status: string;
  gate: number | null;
  created: number;
  stage_at: number;
  attempt: number;
  method: string;
  destination: string;
  code: number | null;
  ended?: number;
  trace: EventRow[];
};
export type EventRow = {
  seq: number;
  time: number;
  kind: string;
  id: string;
  gate?: number;
  status?: string;
};
export type Metrics = {
  created: number;
  succeeded: number;
  http_errors: number;
  transport_failures: number;
  active: number;
  queue: number;
  retries: number;
  rps: number;
  p50: number;
  p95: number;
  p99: number;
};
export type State = {
  version: number;
  time: number;
  running: boolean;
  done: boolean;
  requests: RequestRow[];
  events: EventRow[];
  metrics: Metrics;
  config: {
    scenario?: unknown;
    capacity?:number;
    queue_limit?:number;
    online: boolean[];
    routing: boolean[];
    retries: number;
    breaker: boolean;
  };
  gates: {
    id: number;
    online: boolean;
    active: number;
    queue: number;
    failures: number;
    circuit: boolean;
  }[];
  frames: number;
  replay: number | null;
  replayPlaying: boolean;
  baseline: Metrics | null;
};
