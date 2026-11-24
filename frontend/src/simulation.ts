/** Browser port of backend/engine.py. Ordering is (logical time, insertion sequence). */
import type { State, RequestRow, EventRow } from "./types";
export type Config = State["config"] & {
  capacity: number;
  queue_limit: number;
  balance?: boolean;
  accelerated?: boolean;
  normalize_headers?: boolean;
  validate_payload?: boolean;
  isolate?: boolean;
  scenario?: {
    count?: number;
    affected?: number;
    corruption?: number;
    dependency?: number;
    outage_start?: number;
    outage_end?: number;
    interval?: number;
    service?: number[];
    seed?: number;
    hotspot?: boolean;
    burst?: boolean;
    transient?: number;
    header?: number;
  };
};
type Row = RequestRow & { preferred: number; started?: number };
type Snapshot = Omit<State, "frames" | "replay" | "replayPlaying" | "baseline">;
type Scheduled = [number, number, string, number, number | null];
const terminal = new Set(["succeeded", "http_error", "timed_out", "cancelled"]);
const round = (n: number, d = 0) => Number(n.toFixed(d));
const clone = <T>(v: T): T => structuredClone(v);
export class Airport {
  config: Config;
  time = 0;
  running = false;
  requests = new Map<number, Row>();
  events: EventRow[] = [];
  heap: Scheduled[] = [];
  sequence = 0;
  active = [0, 0, 0];
  queues: number[][] = [[], [], []];
  failures = [0, 0, 0];
  open_circuits = [false, false, false];
  history: Snapshot[] = [];
  replaying: number | null = null;
  replay_playing = false;
  baseline: State["baseline"] = null;
  constructor(config?: Config) {
    this.config = clone(
      config ?? {
        online: [true, true, false],
        routing: [true, true, true],
        capacity: 4,
        queue_limit: 12,
        retries: 0,
        breaker: false,
      },
    );
    const manifest = [
      ...Array.from({ length: 27 }, () => [0, 1, 2]).flat(),
      ...Array.from({ length: 9 }, () => [0, 1]).flat(),
      0,
    ];
    const scenario = this.config.scenario ?? {};
    Array.from(
      { length: scenario.count ?? 100 },
      (_, i) => manifest[i % manifest.length],
    ).forEach((g, i) => {
      if (scenario.hotspot)
        g =
          (i * 17 + (scenario.seed ?? 0)) % 10 < 8
            ? (scenario.affected ?? 0)
            : scenario.affected !== undefined
              ? i % 3
              : 1 + (i % 2);
      const when = scenario.burst
        ? Math.floor(i / 20) * 0.45 + (i % 20) * 0.006
        : i * (scenario.interval ?? 0.12);
      this.schedule(when, "create", i, g);
    });
    this.record();
  }
  schedule(t: number, k: string, r: number, g: number | null = null) {
    this.heap.push([round(t, 5), ++this.sequence, k, r, g]);
    this.heap.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  }
  emit(kind: string, r: Row, data: Record<string, unknown> = {}) {
    const e = {
      version: 1,
      seq: this.events.length,
      time: round(this.time, 3),
      kind,
      id: r.id,
      ...data,
    };
    this.events.push(e);
    r.trace.push(e);
  }
  finish(r: Row, status: string, code: number | null = null) {
    if (terminal.has(r.status)) return;
    Object.assign(r, { status, code, ended: this.time });
    this.emit(code ? "REQUEST_COMPLETED" : "REQUEST_TIMED_OUT", r, {
      status,
      code,
    });
  }
  route(r: Row) {
    const eligible = [0, 1, 2].filter(
      (i) => this.config.routing[i] && !this.open_circuits[i],
    );
    if (!eligible.length) {
      this.schedule(this.time + 0.2, "timeout", r.n);
      return;
    }
    let g = eligible.includes(r.preferred)
      ? r.preferred
      : eligible[r.n % eligible.length];
    if (this.config.balance) {
      const load = (i: number) =>
        this.active[i] +
        this.queues[i].length +
        [...this.requests.values()].filter(
          (q) => q.status === "routing" && q.gate === i,
        ).length;
      g = [...eligible].sort((a, b) => load(a) - load(b) || a - b)[0];
    }
    Object.assign(r, { gate: g, status: "routing", stage_at: this.time });
    this.emit("SERVICE_SELECTED", r, { gate: g });
    this.schedule(this.time + 0.5, "queue", r.n, g);
  }
  start(r: Row, g: number) {
    this.active[g]++;
    Object.assign(r, {
      status: "processing",
      stage_at: this.time,
      started: this.time,
    });
    this.emit("REQUEST_STARTED", r, { gate: g });
    let service = this.config.scenario?.service?.[g] ?? 0.6;
    if (this.config.accelerated) service *= 0.35;
    this.schedule(this.time + service + (r.n % 4) * 0.08, "complete", r.n, g);
  }
  process(k: string, id: number, gate: number | null) {
    const g = gate as number;
    if (k === "create") {
      const r: Row = {
        n: id,
        id: `REQ-${String(id + 1).padStart(3, "0")}`,
        status: "created",
        preferred: g,
        gate: null,
        created: this.time,
        stage_at: this.time,
        attempt: 0,
        method: "GET",
        destination: "/api/departures",
        trace: [],
        code: null,
      };
      this.requests.set(id, r);
      this.emit("REQUEST_CREATED", r);
      this.schedule(this.time + 0.25, "dns", id);
      return;
    }
    const r = this.requests.get(id)!;
    if (terminal.has(r.status)) return;
    if (k === "dns") {
      Object.assign(r, { status: "security", stage_at: this.time });
      this.emit("DNS_RESOLVED", r);
      this.schedule(this.time + 0.25, "tls", id);
    } else if (k === "tls") {
      this.emit("TLS_ESTABLISHED", r);
      this.route(r);
    } else if (k === "queue") {
      const scenario = this.config.scenario ?? {};
      const transient =
        scenario.transient === g &&
        r.attempt === 0 &&
        (id * 17 + (scenario.seed ?? 0)) % 5 === 0;
      const outage =
        scenario.dependency !== undefined &&
        this.time >= (scenario.outage_start ?? 0) &&
        this.time < (scenario.outage_end ?? 999);
      const cascade =
        outage && (g === scenario.dependency || !this.config.isolate);
      if (cascade)
        this.emit("DEPENDENCY_UNAVAILABLE", r, { gate: scenario.dependency });
      if (!this.config.online[g] || transient || cascade) {
        Object.assign(r, { status: "waiting", stage_at: this.time });
        this.emit("CONNECTION_PENDING", r, { gate: g });
        this.schedule(this.time + 2, "timeout", id, g);
      } else if (this.active[g] < this.config.capacity) this.start(r, g);
      else if (this.queues[g].length < this.config.queue_limit) {
        this.queues[g].push(id);
        Object.assign(r, { status: "queued", stage_at: this.time });
        this.emit("REQUEST_QUEUED", r, { gate: g });
      } else this.finish(r, "http_error", 503);
    } else if (k === "complete") {
      this.active[g]--;
      if (this.config.online[g]) {
        if (
          this.config.scenario?.header === g &&
          !this.config.normalize_headers
        ) {
          this.emit("HEADER_REJECTED", r, { gate: g });
          this.finish(r, "http_error", 421);
        } else {
          if (this.config.scenario?.corruption === g) {
            r.correct = !!this.config.validate_payload;
            this.emit(
              r.correct ? "PAYLOAD_RECONCILED" : "PAYLOAD_MISMATCH",
              r,
              { gate: g },
            );
          }
          this.finish(r, "succeeded", 200);
        }
      } else {
        this.schedule(this.time + 2, "timeout", id, g);
        Object.assign(r, { status: "waiting", stage_at: this.time });
      }
      if (this.queues[g].length)
        this.schedule(this.time, "queue", this.queues[g].shift()!, g);
    } else if (k === "timeout") {
      if (gate !== null) {
        this.failures[g]++;
        if (
          this.config.breaker &&
          this.failures[g] >= 3 &&
          !this.open_circuits[g]
        ) {
          this.open_circuits[g] = true;
          this.emit("CIRCUIT_OPENED", r, { gate: g });
        }
      }
      if (r.attempt < this.config.retries) {
        r.attempt++;
        Object.assign(r, { status: "retrying", stage_at: this.time });
        this.emit("REQUEST_RETRIED", r);
        this.schedule(this.time + 0.4 * 2 ** (r.attempt - 1), "retry", id);
      } else this.finish(r, "timed_out");
    } else if (k === "retry") this.route(r);
  }
  next() {
    const [t, , k, r, g] = this.heap.shift()!;
    this.time = t;
    this.process(k, r, g);
  }
  advance(dt = 0.1) {
    const target = round(this.time + dt, 5);
    while (this.heap.length && this.heap[0][0] <= target) this.next();
    this.time = target;
    if (!this.heap.length) this.running = false;
    this.record();
  }
  metrics() {
    const rows = [...this.requests.values()],
      latencies = rows
        .filter((r) => r.ended !== undefined)
        .map((r) => (r.ended! - r.created) * 1000)
        .sort((a, b) => a - b),
      count = (s: string) => rows.filter((r) => r.status === s).length;
    const percentile = (p: number) =>
      latencies.length
        ? round(
            latencies[
              Math.min(
                latencies.length - 1,
                Math.ceil(latencies.length * p) - 1,
              )
            ],
          )
        : 0;
    return {
      ...(this.config.scenario?.corruption !== undefined
        ? {
            correct: rows.filter(
              (r) => r.status === "succeeded" && r.correct !== false,
            ).length,
          }
        : {}),
      created: rows.length,
      succeeded: count("succeeded"),
      http_errors: count("http_error"),
      transport_failures: count("timed_out"),
      active: rows.filter((r) => !terminal.has(r.status)).length,
      queue: this.queues.reduce((a, q) => a + q.length, 0),
      retries: rows.reduce((a, r) => a + r.attempt, 0),
      rps: rows.filter((r) => r.created > this.time - 1).length,
      p50: percentile(0.5),
      p95: percentile(0.95),
      p99: percentile(0.99),
    };
  }
  state(): Snapshot {
    return {
      version: 1,
      time: round(this.time, 2),
      running: this.running,
      done: !this.heap.length,
      requests: [...this.requests.values()],
      events: this.events.slice(-80),
      metrics: this.metrics(),
      config: this.config,
      gates: [0, 1, 2].map((i) => ({
        id: i,
        online: this.config.online[i],
        active: this.active[i],
        queue: this.queues[i].length,
        failures: this.failures[i],
        circuit: this.open_circuits[i],
      })),
    };
  }
  record() {
    this.history.push(clone(this.state()));
  }
  view(): State {
    return {
      ...clone(
        this.replaying !== null ? this.history[this.replaying] : this.state(),
      ),
      replay: this.replaying,
      replayPlaying: this.replay_playing,
      frames: this.history.length,
      baseline: clone(this.baseline),
    };
  }
  tick() {
    if (this.replaying !== null) {
      if (this.replay_playing) {
        this.replaying = Math.min(this.replaying + 1, this.history.length - 1);
        if (this.replaying === this.history.length - 1)
          this.replay_playing = false;
      }
    } else if (this.running) this.advance();
  }
  command(action: string, value?: unknown) {
    if (action === "configure") {
      const c = value as Config;
      if (
        !c ||
        !["online", "routing"].every(
          (k) =>
            Array.isArray(c[k as "online"]) &&
            c[k as "online"].length === 3 &&
            c[k as "online"].every((x) => typeof x === "boolean"),
        ) ||
        !(
          c.capacity >= 1 &&
          c.capacity <= 12 &&
          c.queue_limit >= 0 &&
          c.queue_limit <= 40 &&
          c.retries >= 0 &&
          c.retries <= 3
        )
      )
        throw Error("Invalid architecture");
      if (![c.capacity, c.queue_limit, c.retries].every(Number.isInteger))
        throw Error("Architecture limits must be integers");
      const scenario = c.scenario ?? {};
      if (
        typeof scenario !== "object" ||
        !(
          typeof (scenario.interval ?? 0.12) === "number" &&
          (scenario.interval ?? 0.12) >= 0.001 &&
          (scenario.interval ?? 0.12) <= 1
        )
      )
        throw Error("Invalid workload interval");
      if (
        !Number.isInteger(scenario.count ?? 100) ||
        (scenario.count ?? 100) < 40 ||
        (scenario.count ?? 100) > 160
      )
        throw Error("Invalid workload count");
      for (const k of ["affected", "corruption", "dependency"] as const)
        if (
          scenario[k] !== undefined &&
          (!Number.isInteger(scenario[k]) ||
            scenario[k]! < 0 ||
            scenario[k]! > 2)
        )
          throw Error("Invalid workload gate");
      for (const k of ["outage_start", "outage_end"] as const)
        if (
          scenario[k] !== undefined &&
          (!Number.isFinite(scenario[k]) ||
            scenario[k]! < 0 ||
            scenario[k]! > 60)
        )
          throw Error("Invalid outage window");
      const service = scenario.service ?? [0.6, 0.6, 0.6];
      if (
        !Array.isArray(service) ||
        service.length !== 3 ||
        service.some(
          (v) =>
            typeof v !== "number" || v < 0.01 || v > 10 || !Number.isFinite(v),
        )
      )
        throw Error("Invalid service durations");
      if (
        !Number.isInteger(scenario.seed ?? 0) ||
        [scenario.header, scenario.transient].some(
          (v) => v !== undefined && (!Number.isInteger(v) || v < 0 || v > 2),
        )
      )
        throw Error("Invalid workload seed or gate");
      Object.assign(this, new Airport(c));
    } else if (action === "seek") {
      this.running = false;
      this.replay_playing = false;
      this.replaying = Math.max(
        0,
        Math.min(Math.trunc(Number(value)), this.history.length - 1),
      );
    } else if (action === "live") {
      this.replaying = null;
      this.replay_playing = false;
    } else if (action === "play_replay")
      this.replay_playing = this.replaying !== null;
    else if (action === "pause_replay") this.replay_playing = false;
    else if (action === "reset" || action === "rerun") {
      const config = action === "rerun" ? clone(this.config) : undefined,
        baseline = action === "rerun" ? this.metrics() : null;
      Object.assign(this, new Airport(config));
      this.baseline = baseline;
      this.running = true;
    } else if (this.replaying !== null)
      throw Error("Return to live before changing the simulation.");
    else if (action === "play") this.running = !!this.heap.length;
    else if (action === "pause") this.running = false;
    else if (action === "step") {
      this.running = false;
      if (this.heap.length) {
        this.next();
        this.record();
      }
    } else if (action === "online" || action === "routing") {
      const [g, enabled] = value as [number, boolean];
      if (
        !Number.isInteger(g) ||
        g < 0 ||
        g > 2 ||
        typeof enabled !== "boolean"
      )
        throw Error("Invalid gate setting");
      this.config[action][g] = enabled;
    } else if (action === "retries")
      this.config.retries = Math.max(0, Math.min(3, Math.trunc(Number(value))));
    else if (action === "breaker") this.config.breaker = !!value;
    else throw Error("Unknown action");
  }
}
