import { useState, useEffect } from "react";
import type { Config } from "./simulation";
import type { State } from "./types";
import { cost, passed, type Mission, type Save } from "./campaign";
export default function MissionConsole({
  state,
  command,
  mission,
  save,
  onComplete,
  onMap,
  evaluate,
  price = cost,
  finalEvaluation = false,
  capabilities,
}: {
  state: State;
  command: (a: string, v?: unknown) => Promise<void>;
  mission: Mission;
  save: Save;
  onComplete: (s: State, e: string[], runs: number, severe?: boolean) => void;
  evaluate?: (s: State, e: string[]) => boolean;
  price?: (c: Config) => number;
  finalEvaluation?: boolean;
  capabilities?: string[];
  onMap: () => void;
}) {
  const [draft, setDraft] = useState<Config | null>(null),
    [evidence, setEvidence] = useState<string[]>([]),
    [sample, setSample] = useState(""),
    [runs, setRuns] = useState(0),
    [open, setOpen] = useState(true),
    [view, setView] = useState<"brief" | "diagnose" | "engineer">("brief");
  const c = draft ?? (state.config as Config),
    goal = mission.completion_conditions!,
    ready = evaluate
      ? evaluate(state, evidence)
      : passed(mission, state, evidence);
  const total = mission.workload?.count ?? 100;
  const [severe, setSevere] = useState(false);
  useEffect(() => {
    if (
      state.done &&
      state.replay === null &&
      state.metrics.succeeded < total * 0.8 &&
      runs > 0
    )
      setSevere(true);
  }, [state.done, runs]);
  const patch = (p: Partial<Config>) =>
    setDraft({ ...structuredClone(c), ...p });
  function collect(id: string) {
    if (!state.metrics.created) {
      setSample(
        "Run the workload first; evidence is collected from actual requests.",
      );
      return;
    }
    if (id === "trace" && !state.requests.some((r) => r.ended !== undefined)) {
      setSample("Let a journey finish before reconstructing its trace.");
      return;
    }
    setEvidence((v) => [...new Set([...v, id])]);
    if (id === "distribution")
      setSample(
        `Probe at ${state.time.toFixed(1)}s / experiment ${runs}\n` +
          ["A", "B", "C"]
            .map((g, i) => {
              const rows = state.requests.filter((r) => r.gate === i);
              return `${g}: ${rows.length} routed · ${rows.filter((r) => r.status === "http_error").length} HTTP errors · ${rows.filter((r) => r.status === "timed_out").length} timeouts`;
            })
            .join("\n"),
      );
    if (id === "trace") {
      const r =
        state.requests.find((r) => r.correct === false) ??
        state.requests.find(
          (r) => r.status === "http_error" || r.status === "timed_out",
        ) ??
        [...state.requests].sort(
          (a, b) =>
            (b.ended ?? state.time) -
            b.created -
            ((a.ended ?? state.time) - a.created),
        )[0];
      setSample(
        `${r.id} / gate ${r.gate === null ? "—" : "ABC"[r.gate]} · HTTP ${r.code ?? "no response"}\nExperiment ${runs}, probe at ${state.time.toFixed(1)}s\n` +
          r.trace
            .map(
              (e) =>
                `${e.time.toFixed(2)}s ${e.kind.toLowerCase().replaceAll("_", " ")}`,
            )
            .join("\n"),
      );
    }
    if (id === "queue")
      setSample(
        `Experiment ${runs}, probe at ${state.time.toFixed(1)}s\n` +
          state.gates
            .map(
              (g) =>
                `Gate ${"ABC"[g.id]}: ${g.active} workers busy · ${g.queue} waiting`,
            )
            .join("\n") +
          `\nObserved p95 ${state.metrics.p95}ms. HTTP 503 indicates queue rejection; no response indicates transport failure.`,
      );
  }
  async function run() {
    await command("configure", {
      ...structuredClone(c),
      scenario: mission.workload,
    });
    await command("play");
    setRuns((v) => v + 1);
    setDraft(null);
    setView("diagnose");
  }
  return (
    <>
      <div className="campaign-nav glass">
        <button
          onClick={() => {
            void command("pause");
            onMap();
          }}
        >
          Return to Headquarters
        </button>
        <button
          onClick={() =>
            void command(
              state.replay !== null
                ? state.replayPlaying
                  ? "pause_replay"
                  : "play_replay"
                : state.running
                  ? "pause"
                  : "play",
            )
          }
          disabled={state.done && state.replay === null}
        >
          {(state.replay !== null ? state.replayPlaying : state.running)
            ? "Pause"
            : "Continue"}
        </button>
        <button
          onClick={() => {
            setDraft(null);
            void command("configure", {
              ...save.architecture,
              ...mission.starting_architecture_delta,
              scenario: mission.workload,
            });
            setRuns(0);
            setEvidence([]);
          }}
        >
          Restart case
        </button>
        <button aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? "Hide console" : "Case console"}
        </button>
      </div>
      {open && (
        <section className="case-console glass" aria-label="Case console">
          <header>
            <span className="eyebrow">{mission.id} / FIELD OPERATIONS</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close case console"
            >
              ×
            </button>
          </header>
          <h2>{mission.title}</h2>
          <div
            className="case-tabs"
            role="group"
            aria-label="Investigation views"
          >
            {(["brief", "diagnose", "engineer"] as const).map((v) => (
              <button
                key={v}
                aria-pressed={view === v}
                disabled={
                  !!evaluate && v === "engineer" && evidence.length === 0
                }
                onClick={() => setView(v)}
              >
                {v === "brief"
                  ? "Brief"
                  : v === "diagnose"
                    ? "Evidence"
                    : "Architecture"}
              </button>
            ))}
          </div>
          <div className="objectives">
            <span className={state.metrics.succeeded === total ? "met" : ""}>
              {state.metrics.succeeded}/{total} arrivals
            </span>
            <span className={state.metrics.p95 <= goal.p95 ? "met" : ""}>
              p95 ≤ {goal.p95} ms
            </span>
            <span>
              {price(c)}/{goal.max_cost} credits
            </span>
          </div>
          {view === "brief" && (
            <>
              <p>{mission.short_hook}</p>
              <p className="hint">
                Collect evidence, adjust infrastructure, then verify under load.
                Policies persist into the next case. Unfinished tests restart
                after refresh.
              </p>
              <button
                className="primary full"
                onClick={run}
                disabled={state.running}
              >
                Run incident workload
              </button>
            </>
          )}
          {view === "diagnose" && (
            <>
              <div className="diagnostics">
                <button onClick={() => collect("trace")}>
                  Trace a request {evidence.includes("trace") ? "✓" : ""}
                </button>
                <button onClick={() => collect("distribution")}>
                  Sample gate distribution{" "}
                  {evidence.includes("distribution") ? "✓" : ""}
                </button>
                <button onClick={() => collect("queue")}>
                  Inspect queue pressure {evidence.includes("queue") ? "✓" : ""}
                </button>
              </div>
              <pre className="evidence-readout" aria-live="polite">
                {sample ||
                  "Choose a probe. Read the actual traffic before changing the system."}
              </pre>
              <button
                className="outline-button full"
                onClick={() => setView("engineer")}
                disabled={!!evaluate && evidence.length === 0}
              >
                Develop an intervention →
              </button>
            </>
          )}
          {view === "engineer" && (
            <>
              <p className="hint">
                Changes below apply to the next test. Current operating cost:{" "}
                {price(c)} credits.
              </p>
              <div className="architecture-fields">
                <label>
                  Workers per terminal
                  <input
                    aria-label="Workers per terminal"
                    type="number"
                    min={1}
                    max={12}
                    value={c.capacity}
                    onChange={(e) =>
                      patch({
                        capacity: Math.max(
                          1,
                          Math.min(12, Number(e.target.value)),
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  Queue slots
                  <input
                    aria-label="Queue slots"
                    type="number"
                    min={0}
                    max={40}
                    value={c.queue_limit}
                    onChange={(e) =>
                      patch({
                        queue_limit: Math.max(
                          0,
                          Math.min(40, Number(e.target.value)),
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  Retry limit
                  <select
                    aria-label="Retry limit"
                    value={c.retries}
                    onChange={(e) => patch({ retries: Number(e.target.value) })}
                  >
                    {[0, 1, 2, 3].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
                {(
                  [
                    "balance",
                    "accelerated",
                    "normalize_headers",
                    "breaker",
                    "validate_payload",
                    "isolate",
                  ] as const
                )
                  .filter(
                    (k) =>
                      !capabilities ||
                      !["validate_payload", "isolate"].includes(k) ||
                      capabilities.includes(k),
                  )
                  .map((k) => (
                    <label key={k}>
                      {
                        {
                          balance: "Least-loaded routing (+2)",
                          accelerated: "Accelerated workers (+8)",
                          normalize_headers: "Normalize headers (+2)",
                          breaker: "Circuit breaker",
                          validate_payload: "Reconcile payloads (+2)",
                          isolate: "Isolate dependencies (+2)",
                        }[k]
                      }
                      <input
                        type="checkbox"
                        checked={!!c[k]}
                        onChange={(e) => patch({ [k]: e.target.checked })}
                      />
                    </label>
                  ))}
                <fieldset>
                  <legend>Enabled routes</legend>
                  {["A", "B", "C"].map((g, i) => (
                    <label key={g}>
                      {g}
                      <input
                        aria-label={`Route ${g}`}
                        type="checkbox"
                        checked={c.routing[i]}
                        onChange={(e) =>
                          patch({
                            routing: c.routing.map((v, j) =>
                              i === j ? e.target.checked : v,
                            ),
                          })
                        }
                      />
                    </label>
                  ))}
                </fieldset>
                <fieldset>
                  <legend>Service deployment</legend>
                  {["A", "B", "C"].map((g, i) => (
                    <label key={g}>
                      {g}
                      <input
                        aria-label={`Service ${g}`}
                        type="checkbox"
                        checked={c.online[i]}
                        onChange={(e) =>
                          patch({
                            online: c.online.map((v, j) =>
                              i === j ? e.target.checked : v,
                            ),
                          })
                        }
                      />
                    </label>
                  ))}
                </fieldset>
              </div>
              <button
                className="primary full"
                onClick={run}
                disabled={state.running || price(c) > goal.max_cost}
              >
                Verify architecture
              </button>
            </>
          )}
          {state.done && state.replay === null && (
            <div className={`case-verdict ${ready ? "met" : ""}`} role="status">
              <b>
                {ready
                  ? finalEvaluation
                    ? "Evaluation recorded. Redesign or continue."
                    : "Objectives met. Case ready to close."
                  : "Test complete. Objectives remain."}
              </b>
              <p>
                {state.metrics.succeeded}/{total} · p95 {state.metrics.p95} ms ·{" "}
                {price(state.config as Config)} credits · {evidence.length}{" "}
                evidence probes
              </p>
              {ready ? (
                <button
                  className="primary full"
                  onClick={() => onComplete(state, evidence, runs, severe)}
                >
                  {finalEvaluation
                    ? "Record evaluation & continue"
                    : "Close case & record architecture"}
                </button>
              ) : (
                <button
                  onClick={() =>
                    setView(evidence.length ? "engineer" : "diagnose")
                  }
                >
                  {evidence.length ? "Revise architecture" : "Collect evidence"}
                </button>
              )}
            </div>
          )}
          <footer>
            <button
              onClick={() => {
                if (state.frames > 1) void command("seek", 0);
              }}
            >
              Replay test
            </button>
            <span>
              Experiment {runs} · {evidence.length} probes
            </span>
          </footer>
        </section>
      )}
    </>
  );
}
