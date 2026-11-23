import content from "../../shared/campaign.json" with { type: "json" };
import type { Config } from "./simulation";
import type { State } from "./types";
export type Mission = {
  id: string;
  act: number;
  title: string;
  playable: boolean;
  short_hook?: string;
  prerequisites?: string[];
  exclusive_group?: string | null;
  workload?: Config["scenario"];
  starting_architecture_delta?: Partial<Config>;
  completion_conditions?: {
    arrivals: number;
    p95: number;
    max_cost: number;
    evidence: number;
  };
  debrief?: string;
};
export const missions = content.missions as Mission[];
export const endings = content.endings;
export const canonicalEdges = content.edges;
export const base = content.base_architecture as Config;
export type RecordEntry = {
  id: string;
  architecture: Config;
  metrics: State["metrics"];
  cost: number;
  evidence: string[];
  experiments: number;
  ending?: string;
};
export type Save = {
  version: 2;
  architecture: Config;
  history: RecordEntry[];
  choices: Record<string, string>;
  current: string | null;
  reserve: number;
  ending: string | null;
};
export const fresh = (): Save => ({
  version: 2,
  architecture: structuredClone(base),
  history: [],
  choices: {},
  current: null,
  reserve: 12,
  ending: null,
});
export const cost = (c: Config) =>
  c.capacity * c.routing.filter(Boolean).length +
  (c.accelerated ? 8 : 0) +
  (c.balance ? 2 : 0) +
  (c.normalize_headers ? 2 : 0) +
  Math.ceil(c.queue_limit / 8) +
  c.retries * 2;
export function status(m: Mission, s: Save): string {
  if (!m.playable) return "Future";
  if (s.history.some((h) => h.id === m.id)) return "Completed";
  if (
    m.exclusive_group &&
    s.choices[m.exclusive_group] &&
    s.choices[m.exclusive_group] !== m.id
  )
    return "Alternate";
  if (
    m.prerequisites?.length &&
    !m.prerequisites.some((id) => s.history.some((h) => h.id === id))
  )
    return "Locked";
  if (
    m.id === "A04" &&
    !s.history.some((h) => h.id === "A02" && h.evidence.includes("trace"))
  )
    return "Locked";
  if (
    m.id === "B03" &&
    !s.architecture.balance &&
    !s.history.some(
      (h) => h.id === "B01" && h.evidence.includes("distribution"),
    )
  )
    return "Locked";
  if (
    m.id === "B02" &&
    s.architecture.balance &&
    s.architecture.queue_limit < 16
  )
    return "Locked";
  return s.current === m.id ? "In progress" : "Available";
}
export function whyLocked(m: Mission, s: Save) {
  if (!m.playable)
    return "Not implemented in this slice. Future cases cannot be launched.";
  if (
    m.id === "A04" &&
    s.history.some((h) => h.id === "A02") &&
    !s.history.some((h) => h.id === "A02" && h.evidence.includes("trace"))
  )
    return "Replay Slow Arrivals and collect a request trace to unlock this forensic route.";
  if (
    m.id === "B03" &&
    !s.architecture.balance &&
    s.history.some((h) => h.id === "B01") &&
    !s.history.some(
      (h) => h.id === "B01" && h.evidence.includes("distribution"),
    )
  )
    return "Replay Morning Surge and sample the gate distribution to unlock this route.";
  if (
    m.id === "B02" &&
    s.history.some((h) => h.id === "B01") &&
    s.architecture.balance &&
    s.architecture.queue_limit < 16
  )
    return "This route investigates buffered bursts. Replay Morning Surge with at least 16 queue slots, or follow Load Balancer Blindspot with your current routing policy.";
  return `Complete ${m.prerequisites?.map((id) => missions.find((m) => m.id === id)?.title).join(" or ") || "the prior case"} first.`;
}
export function configFor(m: Mission, s: Save): Config {
  const c = {
    ...structuredClone(s.architecture),
    ...structuredClone(m.starting_architecture_delta),
    scenario: structuredClone(m.workload),
  } as Config;
  // Incident-specific arrival inputs change; all purchased policies and routes persist.
  if (m.id === "A01") Object.assign(c, { online: [true, true, false] });
  return c;
}
export function passed(m: Mission, state: State, evidence: string[]) {
  const c = m.completion_conditions!;
  return (
    JSON.stringify((state.config as Config).scenario) ===
      JSON.stringify(m.workload) &&
    state.done &&
    state.replay === null &&
    state.metrics.created === 100 &&
    state.metrics.succeeded >= c.arrivals &&
    state.metrics.p95 <= c.p95 &&
    cost(state.config as Config) <= c.max_cost &&
    evidence.length >= c.evidence
  );
}
export function complete(
  s: Save,
  m: Mission,
  state: State,
  evidence: string[],
  experiments: number,
): Save {
  if (!passed(m, state, evidence))
    throw Error("Verification objectives are not met.");
  const architecture = structuredClone(state.config) as Config;
  delete architecture.scenario;
  const ending =
    m.id === "S01"
      ? cost(architecture) <= 35
        ? "precision"
        : "headroom"
      : undefined;
  const entry = {
    id: m.id,
    architecture,
    metrics: structuredClone(state.metrics),
    cost: cost(architecture),
    evidence,
    experiments,
    ...(ending ? { ending } : {}),
  };
  const next = {
    ...s,
    reserve: s.history.some((h) => h.id === m.id)
      ? Math.min(12, s.reserve + 4)
      : s.reserve,
    architecture,
    history: [...s.history.filter((h) => h.id !== m.id), entry],
    current: null,
    choices: { ...s.choices },
    ending: ending ?? s.ending,
  };
  if (m.exclusive_group) next.choices[m.exclusive_group] = m.id;
  return next;
}
export function switchBranch(s: Save, m: Mission): Save {
  if (!m.exclusive_group || status(m, s) !== "Alternate") return s;
  if (s.reserve < 4)
    throw Error("Replay a completed case to earn 4 audit credits.");
  return {
    ...s,
    reserve: Math.max(0, s.reserve - 4),
    choices: { ...s.choices, [m.exclusive_group]: m.id },
  };
}
export function decode(raw: string | null): Save {
  if (!raw) return fresh();
  try {
    const x = JSON.parse(raw);
    if (x.version === 1) return fresh(); // prior demo had no campaign progress to migrate
    if (
      x.version !== 2 ||
      !Array.isArray(x.history) ||
      !x.architecture ||
      !x.choices ||
      typeof x.choices !== "object" ||
      !Number.isFinite(x.reserve)
    )
      throw Error();
    const c = x.architecture;
    if (
      !["online", "routing"].every(
        (k) =>
          Array.isArray(c[k]) &&
          c[k].length === 3 &&
          c[k].every((v: unknown) => typeof v === "boolean"),
      ) ||
      !Number.isInteger(c.capacity) ||
      c.capacity < 1 ||
      c.capacity > 12 ||
      !Number.isInteger(c.queue_limit) ||
      c.queue_limit < 0 ||
      c.queue_limit > 40 ||
      !Number.isInteger(c.retries) ||
      c.retries < 0 ||
      c.retries > 3
    )
      throw Error();
    if (
      !["breaker", "balance", "accelerated", "normalize_headers"].every(
        (k) => typeof c[k] === "boolean",
      ) ||
      x.reserve < 0 ||
      x.reserve > 12
    )
      throw Error();
    if (
      x.history.some(
        (h: RecordEntry) =>
          !missions.some((m) => m.id === h.id && m.playable) ||
          !h.metrics ||
          !Array.isArray(h.evidence) ||
          !Number.isFinite(h.cost) ||
          !Number.isFinite(h.experiments) ||
          h.metrics.succeeded !== 100 ||
          !Number.isFinite(h.metrics.p95),
      )
    )
      throw Error();
    if (
      new Set(x.history.map((h: RecordEntry) => h.id)).size !== x.history.length
    )
      throw Error();
    if (
      Object.entries(x.choices).some(
        ([group, id]) =>
          !missions.some((m) => m.exclusive_group === group && m.id === id),
      )
    )
      throw Error();
    return {
      ...x,
      current: missions.some((m) => m.id === x.current && m.playable)
        ? x.current
        : null,
    };
  } catch {
    return fresh();
  }
}
export const storageKey = "lost-in-transit.campaign.v2";
