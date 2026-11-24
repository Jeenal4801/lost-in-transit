import { Airport, type Config } from "./simulation.js";
import { base, cost, type Mission, type Save } from "./campaign.js";
import type { State } from "./types.js";
export const generatorVersion = 1;
export type Family =
  | "outage"
  | "latency"
  | "transport"
  | "headers"
  | "surge"
  | "distribution"
  | "correctness"
  | "dependency";
export type Outcome = {
  id: string;
  family: Family;
  seed: number;
  architecture: Config;
  metrics: State["metrics"];
  evidence: string[];
  experiments: number;
  cost: number;
  severe: boolean;
  final: boolean;
};
export type Run = {
  schema: 3;
  id: string;
  seed: number;
  generatorVersion: 1;
  createdAt: number;
  updatedAt: number;
  revision: number;
  architecture: Config;
  outcomes: Outcome[];
  current: Mission & { family: Family; seed: number; final: boolean };
  ending: string | null;
  legacy?: Save;
};
export function hash(seed: number, text: string) {
  let n = seed >>> 0;
  for (const c of text) n = Math.imul(n ^ c.charCodeAt(0), 16777619) >>> 0;
  return n;
}
export const operatingCost = (c: Config) =>
  cost(c) + (c.validate_payload ? 2 : 0) + (c.isolate ? 2 : 0);
const families: Family[] = [
  "outage",
  "latency",
  "transport",
  "headers",
  "surge",
  "distribution",
  "correctness",
  "dependency",
];
const titles: Record<Family, string> = {
  outage: "An empty arrival hall",
  latency: "The long way home",
  transport: "A signal in the rain",
  headers: "Return to sender",
  surge: "The morning rush",
  distribution: "One crowded terminal",
  correctness: "Everything looks green",
  dependency: "The lights beyond the runway",
};
export function incident(
  seed: number,
  family: Family,
  step: number,
  architecture: Config,
  final = false,
): Run["current"] {
  const n = hash(seed, `${family}:${step}`),
    gate = n % 3;
  const count = [80, 100, 120][(n >>> 4) % 3];
  const workload: NonNullable<Config["scenario"]> = {
    seed: n,
    count,
    interval: final ? 0.04 : family === "surge" ? 0.025 : 0.07,
    service: [0.6, 0.6, 0.6],
    affected: gate,
  };
  const delta: Partial<Config> = { online: [true, true, true] };
  if (family === "outage") delta.online![gate] = false;
  if (family === "latency") workload.service![gate] = 2.2 + (n % 4) * 0.15;
  if (family === "transport") workload.transient = gate;
  if (family === "headers") workload.header = gate;
  if (family === "surge") workload.burst = n % 2 === 0;
  if (family === "distribution") workload.hotspot = true;
  if (family === "correctness") workload.corruption = gate;
  if (family === "dependency")
    Object.assign(workload, {
      dependency: gate,
      outage_start: 1 + (n % 3) * 0.2,
      outage_end: 2 + (n % 3) * 0.2,
    });
  if (final)
    Object.assign(workload, {
      hotspot: true,
      transient: (gate + 1) % 3,
      corruption: gate,
      dependency: (gate + 2) % 3,
      outage_start: 1.2,
      outage_end: 2.2,
    });
  return {
    id: `I${String(step + 1).padStart(2, "0")}`,
    act: 1,
    title: final ? `Departure inspection ${step - 7} / 3` : titles[family],
    playable: true,
    family,
    seed: n,
    final,
    workload,
    starting_architecture_delta: delta,
    short_hook: final
      ? "The airport faces a mixed workload. Record the result, or redesign and test again."
      : "Something has changed in the departure stream. Trace a journey and test your hypothesis.",
    completion_conditions: {
      arrivals: count,
      p95: final ? 6500 : 5500,
      max_cost: 56,
      evidence: 1,
    },
  };
}
export function nextIncident(
  r: Pick<Run, "seed" | "outcomes" | "architecture">,
): Run["current"] {
  const seen = new Set(r.outcomes.map((o) => o.family));
  const step = r.outcomes.length;
  if (step >= 8)
    return incident(
      r.seed,
      (["surge", "dependency", "correctness"] as Family[])[
        Math.min(2, step - 8)
      ],
      step,
      r.architecture,
      true,
    );
  let candidates = families.filter((f) => !seen.has(f));
  if (!step) candidates = ["outage", "latency"];
  // Poor distribution and retry-heavy systems bring capacity concepts forward.
  candidates.sort((a, b) => {
    const score = (f: Family) =>
      (hash(r.seed, `${step}:${f}`) % 100) +
      (!r.architecture.balance && f === "distribution" ? 80 : 0) +
      (r.architecture.retries >= 2 && f === "surge" ? 80 : 0) +
      (r.architecture.capacity < 4 && f === "latency" ? 25 : 0) +
      (operatingCost(r.architecture) > 40 && f === "distribution" ? 25 : 0) +
      (r.outcomes.some((o) => o.severe) && f === "dependency" ? 25 : 0) +
      (r.outcomes.some((o) => (o.evidence?.length ?? 0) < 2) &&
      f === "correctness"
        ? 25
        : 0);
    return score(b) - score(a);
  });
  return incident(r.seed, candidates[0], step, r.architecture);
}
export function newRun(
  seed = crypto.getRandomValues(new Uint32Array(1))[0],
  now = Date.now(),
): Run {
  const initial = {
    schema: 3 as const,
    id: crypto.randomUUID(),
    seed: seed >>> 0,
    generatorVersion: 1 as const,
    createdAt: now,
    updatedAt: now,
    revision: 0,
    architecture: structuredClone(base),
    outcomes: [],
    ending: null,
  };
  return { ...initial, current: nextIncident(initial) };
}
export const configuration = (r: Run): Config => ({
  ...structuredClone(r.architecture),
  ...structuredClone(r.current.starting_architecture_delta),
  scenario: structuredClone(r.current.workload),
});
export function verified(m: Run["current"], s: State, e: string[]) {
  const count = m.workload?.count ?? 100;
  return (
    s.done &&
    s.replay === null &&
    s.metrics.created === count &&
    JSON.stringify(s.config.scenario) === JSON.stringify(m.workload) &&
    e.length >= 1 &&
    (m.final ||
      (s.metrics.succeeded === count &&
        (s.metrics.correct ?? count) === count &&
        s.metrics.p95 <= 5500 &&
        operatingCost(s.config as Config) <= 56))
  );
}
export const endingNames: Record<string, string> = {
  precision: "The Precision Network",
  headroom: "Built for Headroom",
  architect: "The Architect",
  golden: "The Golden Cage",
  domino: "The Domino Effect",
  fast: "Move Fast, Break Everything",
  silent: "The Silent Failure",
  phoenix: "The Phoenix Protocol",
};
export function evaluateEnding(outcomes: Outcome[]) {
  const f = outcomes.filter((o) => o.final);
  if (f.length < 3) return null;
  const total = f.reduce((s, o) => s + o.metrics.created, 0),
    arrived = f.reduce((s, o) => s + o.metrics.succeeded, 0),
    correct = f.reduce(
      (s, o) => s + (o.metrics.correct ?? o.metrics.succeeded),
      0,
    );
  const reliability = arrived / total,
    integrity = correct / Math.max(1, arrived),
    expense = f.reduce((s, o) => s + o.cost, 0) / 3;
  if (reliability >= 0.99 && integrity < 0.98) return "silent";
  if (
    reliability < 0.8 &&
    f.filter((o) => o.metrics.transport_failures > o.metrics.created * 0.2)
      .length >= 2
  )
    return "domino";
  if (reliability < 0.99) return f.every(o=>o.metrics.p95<=6500) ? "fast" : "domino";
  if (expense > 42) return "golden";
  if (
    outcomes.filter((o) => !o.final && o.severe).length >= 2 &&
    f.every((o) => o.architecture.isolate && o.architecture.validate_payload)
  )
    return "phoenix";
  if (
    f.every(
      (o) =>
        o.evidence.length >= 3 &&
        o.architecture.isolate &&
        o.architecture.validate_payload &&
        o.metrics.p95 <= 6500,
    )
  )
    return "architect";
  return expense <= 35 ? "precision" : "headroom";
}
export function finishRun(
  r: Run,
  s: State,
  evidence: string[],
  experiments: number,
  severe: boolean,
): Run {
  if (!verified(r.current, s, evidence))
    throw Error("Complete the workload and collect evidence first.");
  const architecture = structuredClone(s.config) as Config;
  delete architecture.scenario;
  const outcome: Outcome = {
    id: r.current.id,
    family: r.current.family,
    seed: r.current.seed,
    architecture,
    metrics: s.metrics,
    evidence,
    experiments,
    cost: operatingCost(architecture),
    severe,
    final: r.current.final,
  };
  const outcomes = [...r.outcomes, outcome];
  const next = {
    ...r,
    architecture,
    outcomes,
    revision: r.revision + 1,
    updatedAt: Date.now(),
    ending: evaluateEnding(outcomes),
  };
  return { ...next, current: next.ending ? r.current : nextIncident(next) };
}
export function simulate(config: Config): State {
  const a = new Airport(config);
  a.command("play");
  while (a.heap.length) a.tick();
  return a.view();
}
export function feasible(r: Run): Config {
  return {
    ...configuration(r),
    online: [true, true, true],
    routing: [true, true, true],
    capacity: 10,
    queue_limit: 40,
    retries: 1,
    balance: true,
    accelerated: true,
    normalize_headers: true,
    validate_payload: true,
    isolate: true,
  };
}
