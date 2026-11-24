import { newRun, type Run, generatorVersion, endingNames } from "./director.js";
import { decode as decodeLegacy, storageKey } from "./campaign.js";
import { Airport } from "./simulation.js";
export const vaultKey = "lost-in-transit.vault.v3";
export type Vault = { version: 3; active: string; runs: Run[] };
export interface StoragePort {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}
export function validateRun(raw: unknown): Run {
  if (JSON.stringify(raw).length > 120000)
    throw Error("Save exceeds size limit");
  const r = raw as Run;
  if (
    !r ||
    r.schema !== 3 ||
    r.generatorVersion !== generatorVersion ||
    typeof r.id !== "string" ||
    !/^[a-zA-Z0-9-]{1,80}$/.test(r.id) ||
    !Number.isInteger(r.seed) ||
    r.seed < 0 ||
    r.seed > 4294967295 ||
    !Number.isInteger(r.revision) ||
    r.revision < 0 ||
    !Number.isFinite(r.createdAt) ||
    !Number.isFinite(r.updatedAt) ||
    !Array.isArray(r.outcomes) ||
    r.outcomes.length > 11 ||
    !r.current ||
    typeof r.current.id !== "string"
  )
    throw Error("Unsupported or damaged save");
  const families = [
    "outage",
    "latency",
    "transport",
    "headers",
    "surge",
    "distribution",
    "correctness",
    "dependency",
  ];
  if (
    typeof r.current.title !== "string" ||
    r.current.title.length > 150 ||
    typeof r.current.short_hook !== "string" ||
    r.current.short_hook.length > 1000 ||
    !families.includes(r.current.family) ||
    typeof r.current.final !== "boolean" ||
    !(
      r.ending === null ||
      (typeof r.ending === "string" && Object.hasOwn(endingNames, r.ending))
    )
  )
    throw Error("Invalid incident presentation");
  if (r.legacy) r.legacy = decodeLegacy(JSON.stringify(r.legacy));
  const goal = r.current.completion_conditions;
  if (
    !goal ||
    ![goal.arrivals, goal.p95, goal.max_cost, goal.evidence].every(
      Number.isFinite,
    ) ||
    goal.arrivals < 40 ||
    goal.arrivals > 160 ||
    goal.p95 < 1 ||
    goal.p95 > 60000 ||
    goal.max_cost < 1 ||
    goal.max_cost > 100
  )
    throw Error("Invalid completion criteria");
  const a = new Airport();
  a.command("configure", r.architecture);
  if (
    !r.current.workload ||
    !Number.isInteger(r.current.seed) ||
    !r.current.completion_conditions
  )
    throw Error("Missing incident");
  a.command("configure", {
    ...r.architecture,
    ...r.current.starting_architecture_delta,
    scenario: r.current.workload,
  });
  for (const o of r.outcomes) {
    if (
      !o ||
      typeof o.id !== "string" ||
      !families.includes(o.family) ||
      typeof o.final !== "boolean" ||
      typeof o.severe !== "boolean" ||
      !Array.isArray(o.evidence) ||
      o.evidence.some((e) => !["trace", "distribution", "queue"].includes(e)) ||
      !o.metrics ||
      !Number.isFinite(o.metrics.p95) ||
      !Number.isInteger(o.metrics.created) ||
      o.metrics.created < 40 ||
      o.metrics.created > 160 ||
      !Number.isInteger(o.metrics.succeeded) ||
      o.metrics.succeeded < 0 ||
      o.metrics.succeeded > o.metrics.created ||
      !Number.isFinite(o.cost) ||
      !Number.isInteger(o.experiments)
    )
      throw Error("Invalid incident history");
    a.command("configure", o.architecture);
  }
  return structuredClone(r);
}
export function loadVault(storage: StoragePort): Vault {
  const raw = storage.getItem(vaultKey);
  if (raw) {
    const v = JSON.parse(raw) as Vault;
    if (v.version !== 3 || !Array.isArray(v.runs) || v.runs.length > 20)
      throw Error("Invalid campaign archive");
    v.runs = v.runs.map(validateRun);
    if (!v.runs.some((r) => r.id === v.active))
      throw Error("Active campaign missing");
    return v;
  }
  const run = newRun();
  const old = storage.getItem(storageKey);
  if (old) {
    const legacy = decodeLegacy(old);
    if (legacy.history.length) {
      run.legacy = legacy;
      run.architecture = structuredClone(legacy.architecture);
    }
  }
  return { version: 3, active: run.id, runs: [run] };
}
export function saveVault(storage: StoragePort, v: Vault) {
  if (v.runs.length > 20)
    throw Error("Archive full. Export or remove an old campaign.");
  storage.setItem(vaultKey, JSON.stringify(v));
}
export function checkpoint(v: Vault, r: Run): Vault {
  return {
    ...v,
    active: r.id,
    runs: [...v.runs.filter((x) => x.id !== r.id), r],
  };
}
export function importCloud(v: Vault, raw: unknown): Vault {
  return checkpoint(v, validateRun(raw));
}
export class ConflictError extends Error {
  constructor() {
    super(
      "This campaign changed on another device. Load the cloud copy or keep this run as a separate campaign.",
    );
  }
}
