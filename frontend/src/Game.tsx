import React, { useState, useEffect, useRef, lazy, Suspense } from "react";

import {
  Luggage,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Radio,
  Maximize2,
  X,
  Activity,
  Settings2,
  ChevronDown,
  Check,
  Search,
  VolumeX,
  Layers,
  Command,
} from "lucide-react";
import { browserMode, simulation } from "./runtime";
import type { State, RequestRow } from "./types";
import "@fontsource-variable/inter";
import "./style.css";
const Airport = lazy(() => import("./Airport"));
const terminal = ["succeeded", "timed_out", "http_error", "cancelled"];
const label = (s: string) => s.replaceAll("_", " ");
export class SceneBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="canvas-fallback">
        3D is unavailable on this device. Use the gate controls and departure
        board to play.
      </div>
    ) : (
      this.props.children
    );
  }
}
export type GameProps = {
  resetOriginal?: boolean;
  missionConfig?: import("./simulation").Config;
  missionTitle?: string;
  onMap?: () => void;
  renderControls?: (
    state: State,
    command: (action: string, value?: unknown) => Promise<void>,
  ) => React.ReactNode;
};
export default function App({
  resetOriginal,
  missionConfig,
  missionTitle,
  onMap,
  renderControls,
}: GameProps) {
  const [state, setState] = useState<State | null>(null),
    [connected, setConnected] = useState(false),
    [error, setError] = useState("");
  const [landing, setLanding] = useState(!missionConfig),
    [gate, setGate] = useState<number | null>(null),
    [request, setRequest] = useState<number | null>(null),
    [drawer, setDrawer] = useState<"requests" | "events" | null>(null),
    [settings, setSettings] = useState(false),
    [reset, setReset] = useState(0),
    [filter, setFilter] = useState("all"),
    [query, setQuery] = useState(""),
    [brief, setBrief] = useState(false),
    [hideResult, setHideResult] = useState(false),
    [follow, setFollow] = useState(false);
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const m = matchMedia("(prefers-reduced-motion: reduce)");
    const f = () => setReduced(m.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  useEffect(() => {
    const engine = simulation;
    if (engine) {
      setConnected(true);
      setState(engine.view());
      const timer = setInterval(() => {
        if (!engine.running && !engine.replay_playing) return;
        engine.tick();
        setState(engine.view());
      }, 100);
      return () => clearInterval(timer);
    }
    let disposed = false,
      ws: WebSocket,
      timer: ReturnType<typeof setTimeout>;
    const connect = () => {
      ws = new WebSocket(
        `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`,
      );
      ws.onopen = () => {
        setConnected(true);
        setError("");
      };
      let previous = "";
      ws.onmessage = (e) => {
        if (e.data !== previous) {
          previous = e.data;
          setState(JSON.parse(e.data));
        }
      };
      ws.onerror = () => ws.close();
      ws.onclose = () => {
        setConnected(false);
        if (!disposed) timer = setTimeout(connect, 1500);
      };
    };
    connect();
    return () => {
      disposed = true;
      clearTimeout(timer);
      ws?.close();
    };
  }, []);
  async function command(action: string, value?: unknown) {
    if (missionConfig && action === "reset") {
      action = "configure";
      value = missionConfig;
    }
    try {
      if (simulation) {
        simulation.command(action, value);
        setState(simulation.view());
        setError("");
        return;
      }
      const r = await fetch("/api/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, value }),
      });
      if (!r.ok)
        throw new Error((await r.json()).detail ?? "Could not apply command");
      setState(await r.json());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection lost");
    }
  }
  const initialized = useRef(false);
  useEffect(() => {
    if ((missionConfig || resetOriginal) && connected && !initialized.current) {
      initialized.current = true;
      if (missionConfig) void command("configure", missionConfig);
      else void command("reset").then(() => command("pause"));
    }
  }, [connected]);
  useEffect(() => {
    if (!state?.done) setHideResult(false);
  }, [state?.done]);
  function selectGate(i: number) {
    setFollow(false);
    if (landing) return;
    setGate(i);
    setRequest(null);
    setDrawer(null);
  }
  function selectRequest(i: number) {
    setFollow(false);
    setRequest(i);
    setGate(null);
    setDrawer(null);
  }
  function enter() {
    if (landing && state?.metrics.created === 0 && !brief) {
      setBrief(true);
      return;
    }
    setLanding(false);
    window.scrollTo(0, 0);
    if (state && !state.done && state.replay === null) void command("play");
  }
  useEffect(() => {
    if (!brief) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>("[role=dialog]");
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !dialog) return;
      const nodes = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input,select,[tabindex="0"]',
        ),
      );
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [brief]);
  const selected = state?.requests.find((r) => r.n === request),
    m = state?.metrics,
    replay = state?.replay != null,
    success = state?.done && m?.succeeded === 100;
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(
          (e.target as HTMLElement).tagName,
        )
      )
        return;
      if (e.key === "Escape") {
        setGate(null);
        setRequest(null);
        setDrawer(null);
        setSettings(false);
        setBrief(false);
      }
      if (e.code === "Space" && !landing && !brief) {
        e.preventDefault();
        void command(
          state?.replay != null
            ? state.replayPlaying
              ? "pause_replay"
              : "play_replay"
            : state?.running
              ? "pause"
              : "play",
        );
      }
      if (e.key.toLowerCase() === "r" && !landing) setReset((v) => v + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [landing, brief, state?.running, state?.replay, state?.replayPlaying]);
  const rows = (state?.requests ?? []).filter(
    (r) =>
      (filter === "all" ||
        (filter === "failed" &&
          ["timed_out", "http_error"].includes(r.status)) ||
        (filter === "active" && !terminal.includes(r.status))) &&
      r.id.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <main
      className={`${landing ? "intro" : "game"} ${reduced ? "reduce-motion" : ""}`}
    >
      <SceneBoundary>
        <Suspense
          fallback={<div className="loading-scene">Preparing the airport…</div>}
        >
          <Airport
            state={state}
            landing={landing}
            reduced={reduced}
            onGate={selectGate}
            onRequest={selectRequest}
            reset={reset}
            follow={follow ? request : null}
          />
        </Suspense>
      </SceneBoundary>
      <div className="vignette" />
      <header>
        <button
          className="identity"
          onClick={() => {
            if (onMap) {
              void command("pause");
              onMap();
              return;
            }
            setLanding(true);
            void command("pause");
          }}
          aria-label="Lost in Transit home"
        >
          <span className="brand-icon">
            <Luggage size={22} />
          </span>
          <span>
            Lost in Transit
            <span className="identity-sub">THE INTERNET IS AN AIRPORT</span>
          </span>
        </button>
        <div className="header-right">
          {!landing && (
            <span className="mission-chip">
              {missionTitle ? "CAMPAIGN" : "CASE 001"}{" "}
              <span>{missionTitle ?? "The missing 27"}</span>
            </span>
          )}
          <span className={`connection ${connected ? "ok" : ""}`}>
            <i />
            {connected
              ? browserMode
                ? "BROWSER SIMULATION"
                : "PYTHON SIMULATION"
              : "CONNECTING"}
          </span>
          <button
            className="icon-button"
            aria-label="Settings"
            aria-expanded={settings}
            onClick={() => setSettings(!settings)}
          >
            <Settings2 size={19} />
          </button>
        </div>
      </header>
      {error && (
        <div className="error glass" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Dismiss error">
            <X size={16} />
          </button>
        </div>
      )}
      {landing ? (
        <>
          <section className="hero">
            <p className="eyebrow">
              <span /> A DISTRIBUTED SYSTEMS MYSTERY
            </p>
            <h1>
              Every request
              <br />
              has a <em>destination.</em>
            </h1>
            <p className="hero-second">
              Not every request
              <br />
              makes its flight.
            </p>
            <p className="hero-description">
              The internet, reimagined as an airport.
              <br />
              Trace the luggage. Find the fault. Bring it home.
            </p>
            <div className="hero-actions">
              <button className="primary" onClick={enter} disabled={!connected}>
                <Play size={15} fill="currentColor" />
                Enter the airport
              </button>
              <button className="text-button" onClick={() => setBrief(true)}>
                Your first mission
              </button>
            </div>
            <span className="hero-note">
              No sign-up. No cloud. Just you and the incident.
            </span>
          </section>
          <div className="hero-caption">
            <span className="hairline" />
            ONE SUITCASE. ONE HTTP REQUEST.
            <small>Original procedural scene · deterministic simulation</small>
          </div>
          <footer className="intro-footer glass">
            <div className="case-preview">
              <span className="case-number">001</span>
              <div>
                <span className="eyebrow">YOUR FIRST CASE</span>
                <h2>The case of the missing 27</h2>
              </div>
            </div>
            <p>
              100 requests checked in.
              <br />
              <strong>27 never reached their destination.</strong>
            </p>
            <button
              className="outline-button"
              onClick={enter}
              disabled={!connected}
            >
              Take the case
            </button>
          </footer>
        </>
      ) : (
        <>
          <section className="mission-heading">
            <span className="eyebrow">
              {missionTitle
                ? "LIVE INCIDENT / " + missionTitle
                : "INCIDENT COMMAND / CASE 001"}
            </span>
            <h1>
              {missionTitle
                ? "Observe. Test. Rebuild."
                : success
                  ? "All luggage accounted for."
                  : "Something missed its connection."}
            </h1>
            <p>
              {missionTitle
                ? "Use the case console to collect evidence and verify your architecture."
                : success
                  ? "You restored the route. Every request has a successful response."
                  : "Inspect the gates. Follow a request. Find a way home."}
            </p>
          </section>
          <aside className="telemetry glass">
            <div className="panel-heading">
              <span>
                <Activity size={15} /> Airport pulse
              </span>
              <span className="mono">{state?.time.toFixed(1) ?? "0.0"}s</span>
            </div>
            <div className="main-metric">
              <b>
                {m?.succeeded ?? 0}
                <small>/100</small>
              </b>
              <span>successful arrivals</span>
            </div>
            <div className="metric-grid">
              <div>
                <strong className="coral">{m?.transport_failures ?? 0}</strong>
                <span>transport failures</span>
              </div>
              <div>
                <strong>{m?.active ?? 0}</strong>
                <span>in transit</span>
              </div>
              <div>
                <strong>
                  {m?.rps ?? 0}
                  <small>/s</small>
                </strong>
                <span>check-in rate</span>
              </div>
              <div>
                <strong>
                  {m?.p95 ?? 0}
                  <small>ms</small>
                </strong>
                <span>p95 latency</span>
              </div>
            </div>
            <details>
              <summary>
                More telemetry <ChevronDown size={14} />
              </summary>
              <dl>
                <dt>HTTP error responses</dt>
                <dd>{m?.http_errors ?? 0}</dd>
                <dt>Queue depth</dt>
                <dd>{m?.queue ?? 0}</dd>
                <dt>Retry attempts</dt>
                <dd>{m?.retries ?? 0}</dd>
                <dt>p50 / p99</dt>
                <dd>
                  {m?.p50 ?? 0} / {m?.p99 ?? 0} ms
                </dd>
              </dl>
            </details>
          </aside>
          <div className="scene-tools glass">
            <button
              aria-label="Reset camera"
              title="Reset camera (R)"
              onClick={() => setReset((v) => v + 1)}
            >
              <Maximize2 size={17} />
            </button>
            <span>Drag to orbit · scroll to zoom</span>
          </div>
          <div className="gate-nav" aria-label="Inspect terminals">
            {["A", "B", "C"].map((g, i) => (
              <button
                key={g}
                onClick={() => selectGate(i)}
                className={gate === i ? "selected" : ""}
              >
                <span>GATE</span>
                <b>{g}</b>
                <i
                  className={
                    !missionConfig && state?.gates[i].failures ? "amber" : ""
                  }
                />
              </button>
            ))}
          </div>
          {gate !== null && state && (
            <aside
              className="inspector glass"
              aria-label={`Gate ${"ABC"[gate]} inspector`}
            >
              <div className="panel-heading">
                <span>
                  <Layers size={16} /> Terminal inspection
                </span>
                <button
                  aria-label="Close inspector"
                  onClick={() => setGate(null)}
                >
                  <X size={18} />
                </button>
              </div>
              <span className="eyebrow">SERVICE INSTANCE / 0{gate + 1}</span>
              <h2>Gate {"ABC"[gate]}</h2>
              <p>
                {state.gates[gate].online
                  ? "Accepting connections and processing luggage."
                  : "The service is offline. Connections wait until their deadline expires."}
              </p>
              <div
                className={`status-card ${state.gates[gate].online ? "healthy" : "degraded"}`}
              >
                <Radio size={18} />
                {state.gates[gate].online
                  ? "Service online"
                  : "Service offline"}
              </div>
              <button
                className="primary full"
                disabled={replay || !!missionConfig}
                onClick={() =>
                  command("online", [gate, !state.config.online[gate]])
                }
              >
                {state.config.online[gate]
                  ? "Take service offline"
                  : "Restore service"}
              </button>
              <button
                className="outline-button full"
                disabled={replay || !!missionConfig}
                onClick={() => command("rerun")}
              >
                Send verification batch
              </button>
              <dl>
                <dt>Processing / queued</dt>
                <dd>
                  {state.gates[gate].active} / {state.gates[gate].queue}
                </dd>
                <dt>Connection failures</dt>
                <dd>{state.gates[gate].failures}</dd>
                <dt>Circuit</dt>
                <dd>{state.gates[gate].circuit ? "Open" : "Closed"}</dd>
              </dl>
              <label className="switch-row">
                Route traffic here
                <input
                  type="checkbox"
                  disabled={replay || !!missionConfig}
                  checked={state.config.routing[gate]}
                  onChange={(e) => command("routing", [gate, e.target.checked])}
                />
              </label>
              <p className="hint">
                {missionConfig
                  ? "Use Architecture in the case console to stage and verify a change."
                  : "Changes affect new connections. Run a fresh batch to verify recovery."}
              </p>
            </aside>
          )}
          {selected && (
            <RequestInspector
              row={selected}
              follow={follow}
              toggleFollow={() => setFollow(!follow)}
              close={() => {
                setRequest(null);
                setFollow(false);
              }}
            />
          )}
          {!missionConfig &&
            state?.done &&
            !hideResult &&
            gate === null &&
            request === null &&
            !drawer && (
              <aside
                className={`result glass ${success ? "won" : ""}`}
                role="status"
              >
                <button
                  className="result-close"
                  aria-label="Dismiss batch summary"
                  onClick={() => setHideResult(true)}
                >
                  <X size={17} />
                </button>
                <span className="eyebrow">
                  {success ? "INCIDENT RESOLVED" : "BATCH COMPLETE"}
                </span>
                <h2>
                  {success ? (
                    <>
                      <Check size={25} /> Cleared for arrival.
                    </>
                  ) : (
                    `${m?.transport_failures ?? 0} requests need a closer look.`
                  )}
                </h2>
                <p>
                  {success
                    ? "A service outage is a transport failure, not an HTTP error. Restoring the service—or routing around it—lets requests complete."
                    : "Open the departure board to trace a failed request, then inspect its destination gate."}
                </p>
                {state.baseline && (
                  <div className="comparison">
                    <span>
                      Previous batch
                      <strong>{state.baseline.succeeded}/100</strong>
                    </span>
                    <span>
                      This batch<strong>{m?.succeeded}/100</strong>
                    </span>
                  </div>
                )}
                <button
                  className="outline-button full"
                  onClick={() => {
                    setDrawer("requests");
                    setFilter(success ? "all" : "failed");
                  }}
                >
                  Inspect departure board
                </button>
              </aside>
            )}
          <nav className="transport glass" aria-label="Simulation controls">
            <button
              className="play-button"
              disabled={!connected || (!replay && state?.done)}
              aria-label={
                replay
                  ? state?.replayPlaying
                    ? "Pause replay"
                    : "Play replay"
                  : state?.running
                    ? "Pause simulation"
                    : "Play simulation"
              }
              onClick={() =>
                command(
                  replay
                    ? state?.replayPlaying
                      ? "pause_replay"
                      : "play_replay"
                    : state?.running
                      ? "pause"
                      : "play",
                )
              }
            >
              {(replay ? state?.replayPlaying : state?.running) ? (
                <Pause size={18} fill="currentColor" />
              ) : (
                <Play size={18} fill="currentColor" />
              )}
            </button>
            <button
              aria-label="Step one event"
              title="Step one event"
              disabled={replay || state?.done}
              onClick={() => command("step")}
            >
              <SkipForward size={18} />
            </button>
            <span className="transport-state">
              {replay
                ? "REPLAY"
                : state?.done
                  ? "COMPLETE"
                  : state?.running
                    ? "LIVE"
                    : "PAUSED"}
              <small>Logical time · {state?.time.toFixed(1)}s</small>
            </span>
            <div className="scrubber">
              <label htmlFor="replay">Incident timeline</label>
              <input
                id="replay"
                aria-label="Replay incident timeline"
                type="range"
                min="0"
                max={Math.max(0, (state?.frames ?? 1) - 1)}
                value={state?.replay ?? Math.max(0, (state?.frames ?? 1) - 1)}
                onChange={(e) => command("seek", Number(e.target.value))}
              />
            </div>
            {replay && (
              <button className="live-button" onClick={() => command("live")}>
                Return to live
              </button>
            )}
            <button
              aria-label="Reset original incident"
              title="Reset original incident"
              onClick={() => command("reset")}
            >
              <RotateCcw size={17} />
            </button>
            <div className="transport-divider" />
            <button
              className="board-toggle"
              aria-expanded={drawer === "requests"}
              onClick={() => {
                setDrawer(drawer === "requests" ? null : "requests");
                setGate(null);
                setRequest(null);
              }}
            >
              <Luggage size={17} />
              <span>Departures</span>
            </button>
            <button
              aria-label="Incident event log"
              aria-expanded={drawer === "events"}
              onClick={() => {
                setDrawer(drawer === "events" ? null : "events");
                setGate(null);
                setRequest(null);
              }}
            >
              <Command size={17} />
            </button>
          </nav>
          {drawer && (
            <section
              className="drawer glass"
              aria-label={
                drawer === "requests" ? "Departure board" : "Incident log"
              }
            >
              <div className="panel-heading">
                <h2>
                  {drawer === "requests" ? "Departure board" : "Incident log"}
                </h2>
                <button
                  aria-label="Close board"
                  onClick={() => setDrawer(null)}
                >
                  <X size={20} />
                </button>
              </div>
              {drawer === "requests" ? (
                <>
                  <div className="board-filters">
                    <label>
                      <Search size={16} />
                      <input
                        aria-label="Find request"
                        placeholder="Find a request…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    <select
                      aria-label="Filter requests"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="all">All requests</option>
                      <option value="failed">Unsuccessful</option>
                      <option value="active">In transit</option>
                    </select>
                  </div>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Request</th>
                          <th>Gate</th>
                          <th>Outcome</th>
                          <th>HTTP</th>
                          <th>Attempts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr key={r.n}>
                            <td>
                              <button onClick={() => selectRequest(r.n)}>
                                {r.id}
                              </button>
                            </td>
                            <td>{r.gate === null ? "—" : "ABC"[r.gate]}</td>
                            <td>
                              <span className={`outcome ${r.status}`}>
                                {label(r.status)}
                              </span>
                            </td>
                            <td>{r.code ?? "—"}</td>
                            <td>{r.attempt + 1}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {rows.length === 0 && (
                      <p className="empty">No matching requests yet.</p>
                    )}
                  </div>
                </>
              ) : (
                <ol className="event-list">
                  {[...(state?.events ?? [])].reverse().map((e) => (
                    <li key={e.seq}>
                      <time>{e.time.toFixed(2)}s</time>
                      <button
                        onClick={() => {
                          const r = state?.requests.find((r) => r.id === e.id);
                          if (r) selectRequest(r.n);
                        }}
                      >
                        {e.id}
                      </button>
                      <span>{e.kind}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}
        </>
      )}
      {settings && (
        <aside className="settings glass" aria-label="Settings">
          <div className="panel-heading">
            <h2>Flight controls</h2>
            <button
              aria-label="Close settings"
              onClick={() => setSettings(false)}
            >
              <X size={18} />
            </button>
          </div>
          <label className="switch-row">
            Reduce motion
            <input
              type="checkbox"
              checked={reduced}
              onChange={(e) => setReduced(e.target.checked)}
            />
          </label>
          <label className="switch-row">
            Circuit breaker
            <input
              type="checkbox"
              disabled={replay || !!missionConfig}
              checked={state?.config.breaker ?? false}
              onChange={(e) => command("breaker", e.target.checked)}
            />
          </label>
          <label className="switch-row">
            Maximum retries
            <select
              disabled={replay || !!missionConfig}
              value={state?.config.retries ?? 0}
              onChange={(e) => command("retries", Number(e.target.value))}
            >
              {[0, 1, 2, 3].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <p className="hint">
            Circuit breakers stop routing to a gate after three connection
            failures. Retries use exponential backoff.
          </p>
          <p className="sound-note">
            <VolumeX size={16} /> Silent by design
          </p>
          <button
            className="outline-button full"
            onClick={() => setBrief(true)}
          >
            Read the mission brief
          </button>
        </aside>
      )}
      {brief && (
        <div className="modal-backdrop" onClick={() => setBrief(false)}>
          <section
            className="brief glass"
            role="dialog"
            aria-modal="true"
            aria-label="Mission brief"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-brief"
              autoFocus
              aria-label="Close mission brief"
              onClick={() => setBrief(false)}
            >
              <X />
            </button>
            <span className="eyebrow">THE CASE OF THE MISSING 27</span>
            <h2>
              The case of
              <br />
              the missing 27.
            </h2>
            <p>
              100 requests entered the airport. Only 73 arrived. Find the
              problem. Fix the system.
            </p>
            <ol>
              <li>
                <b>Observe.</b> Watch the incident unfold.
              </li>
              <li>
                <b>Investigate.</b> Click a terminal or use the A / B / C
                buttons. Select a suitcase to read its trace.
              </li>
              <li>
                <b>Recover.</b> Choose Restore service or change routing, then
                send a verification batch.
              </li>
            </ol>
            <p className="hint">
              There is more than one valid fix. Every suitcase and outcome comes
              from the deterministic simulation.
            </p>
            <button
              className="primary full"
              onClick={() => {
                setBrief(false);
                enter();
              }}
              disabled={!connected}
            >
              Accept the case
            </button>
          </section>
        </div>
      )}
      {missionConfig && state && renderControls?.(state, command)}
      <div className="bottom-credit">
        LOST IN TRANSIT <span>LOCAL-FIRST · ORIGINAL GEOMETRY</span>
      </div>
    </main>
  );
}
function RequestInspector({
  row,
  close,
  follow,
  toggleFollow,
}: {
  row: RequestRow;
  close: () => void;
  follow: boolean;
  toggleFollow: () => void;
}) {
  return (
    <aside className="inspector glass" aria-label="Request trace">
      <div className="panel-heading">
        <span>Request inspection</span>
        <button aria-label="Close request trace" onClick={close}>
          <X size={18} />
        </button>
      </div>
      <span className="eyebrow">LUGGAGE TAG</span>
      <h2 className="mono">{row.id}</h2>
      <p>
        {row.method} {row.destination}
      </p>
      <span className={`outcome ${row.status}`}>{label(row.status)}</span>
      <dl>
        <dt>Destination gate</dt>
        <dd>{row.gate === null ? "Unassigned" : "ABC"[row.gate]}</dd>
        <dt>HTTP response</dt>
        <dd>{row.code ?? "No response"}</dd>
        <dt>Attempts</dt>
        <dd>{row.attempt + 1}</dd>
        <dt>Total duration</dt>
        <dd>
          {row.ended
            ? `${((row.ended - row.created) * 1000).toFixed(0)} ms`
            : "In progress"}
        </dd>
      </dl>
      <button className="outline-button full" onClick={toggleFollow}>
        {follow ? "Stop following" : "Follow request"}
      </button>
      <h3>Journey timeline</h3>
      <ol className="trace">
        {row.trace.map((e) => (
          <li key={e.seq}>
            <span>{e.kind.toLowerCase().replaceAll("_", " ")}</span>
            <time>{e.time.toFixed(2)}s</time>
          </li>
        ))}
      </ol>
    </aside>
  );
}
