import { lazy, Suspense, useEffect, useRef, useState } from "react";
import Game, { SceneBoundary } from "./Game";
import MissionConsole from "./MissionConsole";
import {
  missions,
  endings,
  canonicalEdges,
  storageKey,
  fresh,
  decode,
  status,
  whyLocked,
  configFor,
  complete,
  switchBranch,
  cost,
  type Mission,
  type Save,
  type RecordEntry,
} from "./campaign";
import type { State } from "./types";
import "./campaign.css";
const Airport = lazy(() => import("./Airport"));
const names = [
  "FIRST CONTACT",
  "UNDER PRESSURE",
  "BROKEN PROMISES",
  "SCALING TRAP",
  "FAULT LINES",
  "ACROSS BORDERS",
  "BLACKOUT",
  "FINAL RECKONING",
];
const positions: Record<string, [number, number]> = {
  A01: [150, 170],
  A02: [340, 170],
  A03: [520, 100],
  A04: [520, 270],
  B01: [720, 170],
  B02: [910, 100],
  B03: [910, 270],
  S01: [1120, 170],
};
missions
  .filter((m) => !positions[m.id])
  .forEach((m) => {
    const a = m.act - 1;
    const i = Number(m.id.slice(1)) - 1;
    positions[m.id] =
      a === 1
        ? [650 + (i - 3) * 180, 430]
        : [
            120 + ((a - 2) % 3) * 430 + (i % 3) * 115,
            620 + Math.floor((a - 2) / 3) * 280 + Math.floor(i / 3) * 100,
          ];
  });
const edges = [
  ["A01", "A02"],
  ["A02", "A03"],
  ["A02", "A04"],
  ["A03", "B01"],
  ["A04", "B01"],
  ["B01", "B02"],
  ["B01", "B03"],
  ["B02", "S01"],
  ["B03", "S01"],
];
export default function Campaign() {
  const [save, setSave] = useState<Save>(() => {
      try {
        return decode(localStorage.getItem(storageKey));
      } catch {
        return fresh();
      }
    }),
    [screen, setScreen] = useState<
      "hq" | "map" | "game" | "result" | "classic"
    >("hq"),
    [selected, setSelected] = useState("A01"),
    [active, setActive] = useState<Mission | null>(null),
    [result, setResult] = useState<RecordEntry | null>(null),
    [notice, setNotice] = useState(""),
    [confirmNew, setConfirmNew] = useState(false);
  const [zoom, setZoom] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 }),
    [history, setHistory] = useState(false);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null,
  );
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
    try {
      localStorage.setItem(storageKey, JSON.stringify(save));
    } catch {
      setNotice(
        "Progress cannot be saved in this browser. Keep this tab open or enable site storage.",
      );
    }
  }, [save]);
  useEffect(() => {
    if (!confirmNew) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>(
      '[aria-label="New campaign"]',
    );
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmNew(false);
      if (e.key === "Tab" && dialog) {
        const buttons = Array.from(dialog.querySelectorAll("button"));
        const first = buttons[0],
          last = buttons[buttons.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [confirmNew]);
  const dossier = missions.find((m) => m.id === selected)!;
  const available = missions.filter((m) =>
    ["Available", "In progress"].includes(status(m, save)),
  );
  function launch(m: Mission) {
    if (!["Available", "In progress", "Completed"].includes(status(m, save)))
      return;
    setSave((s) => ({ ...s, current: m.id }));
    setActive(m);
    setScreen("game");
  }
  function finish(m: Mission, s: State, e: string[], runs: number) {
    const next = complete(save, m, s, e, runs);
    setSave(next);
    setResult(next.history.find((h) => h.id === m.id)!);
    setScreen("result");
  }
  function map() {
    setScreen("map");
    setSelected(save.current ?? available[0]?.id ?? "S01");
  }
  if (screen === "classic")
    return (
      <>
        <Game resetOriginal />
        <button className="classic-back" onClick={() => setScreen("hq")}>
          ← Campaign HQ
        </button>
      </>
    );
  if (screen === "game" && active)
    return (
      <Game
        key={active.id}
        missionConfig={configFor(active, save)}
        missionTitle={active.title}
        onMap={map}
        renderControls={(state, command) => (
          <MissionConsole
            state={state}
            command={command}
            mission={active}
            save={save}
            onMap={map}
            onComplete={(s, e, runs) => finish(active, s, e, runs)}
          />
        )}
      />
    );
  return (
    <main className={`campaign-shell ${reduced ? "reduce-motion" : ""}`}>
      {screen === "hq" && (
        <div className="hq-airport">
          <SceneBoundary>
            <Suspense fallback={null}>
              <Airport
                state={null}
                landing={false}
                reduced={reduced}
                onGate={() => map()}
                onRequest={() => {}}
                reset={0}
                follow={null}
              />
            </Suspense>
          </SceneBoundary>
        </div>
      )}
      <header className="campaign-header">
        <button className="campaign-brand" onClick={() => setScreen("hq")}>
          <span className="brand-glyph">↗</span>
          <span>
            Lost in Transit<small>THE NETWORK EFFECT</small>
          </span>
        </button>
        <nav>
          <button
            onClick={() => setScreen("hq")}
            aria-current={screen === "hq" ? "page" : undefined}
          >
            HQ
          </button>
          <button
            onClick={map}
            aria-current={screen === "map" ? "page" : undefined}
          >
            Campaign map
          </button>
          <button onClick={() => setHistory(!history)} aria-expanded={history}>
            History · {save.history.length}
          </button>
        </nav>
        <span className="saved-indicator">
          {notice.includes("cannot be saved")
            ? "Save unavailable"
            : "● Saved on this device"}
        </span>
      </header>
      {notice && (
        <div className="campaign-notice glass" role="alert">
          {notice}
          <button onClick={() => setNotice("")}>Dismiss</button>
        </div>
      )}
      {history && (
        <aside className="route-history glass">
          <h2>Your flight path</h2>
          {save.history.length ? (
            save.history.map((h) => (
              <button
                key={h.id}
                onClick={() => {
                  setSelected(h.id);
                  setHistory(false);
                  setScreen("map");
                }}
              >
                <b>
                  {h.id} / {missions.find((m) => m.id === h.id)?.title}
                </b>
                <span>
                  {h.metrics.succeeded}/100 · {h.metrics.p95}ms · {h.cost}{" "}
                  credits
                </span>
              </button>
            ))
          ) : (
            <p>Your first case is waiting.</p>
          )}
          <p>
            Architecture persists. Replaying a completed case earns 4 audit
            credits.
          </p>
          <button onClick={() => setHistory(false)}>Close history</button>
        </aside>
      )}
      {screen === "hq" && (
        <>
          <section className="hq-copy">
            <span className="eyebrow">AN INTERACTIVE SYSTEMS CAMPAIGN</span>
            <h1>
              Every decision
              <br />
              has a <em>destination.</em>
            </h1>
            <p>
              Diagnose an airport of requests. Build the architecture that
              carries them home.
            </p>
            <div className="hq-actions">
              <button
                className="primary"
                onClick={() => {
                  if (save.ending && !save.current && !available.length) {
                    setResult(save.history.find((h) => h.id === "S01")!);
                    setScreen("result");
                  } else
                    launch(
                      missions.find((m) => m.id === save.current) ??
                        available[0] ??
                        missions[0],
                    );
                }}
              >
                {save.ending && !save.current && !available.length
                  ? "View postmortem"
                  : save.history.length || save.current
                    ? "Continue campaign"
                    : "Start campaign"}{" "}
                ↗
              </button>
              <button className="outline-button" onClick={map}>
                Explore the map
              </button>
            </div>
            <div className="hq-progress">
              <span>
                {save.history.length}
                <small>CASES RECORDED</small>
              </span>
              <span>
                {cost(save.architecture)}
                <small>OPERATING CREDITS</small>
              </span>
              <span>
                02<small>REACHABLE ENDINGS</small>
              </span>
            </div>
          </section>
          <footer className="hq-footer glass">
            <div>
              <span className="eyebrow">FIRST PLAYABLE CAMPAIGN SLICE</span>
              <p>
                Seven incidents. Three architectural strategies. One convergence
                test.
              </p>
            </div>
            <button onClick={() => setScreen("classic")}>
              Original sandbox ↗
            </button>
            <button onClick={() => setConfirmNew(true)}>New campaign</button>
          </footer>
        </>
      )}
      {screen === "map" && (
        <>
          <section className="map-heading">
            <span className="eyebrow">OPERATIONS / ROUTE PLANNING</span>
            <h1>A network of consequences.</h1>
            <p>Choose a case. Carry your architecture forward.</p>
          </section>
          <div
            className="map-stage"
            onPointerDown={(e) => {
              if ((e.target as Element).closest("button")) return;
              drag.current = {
                x: e.clientX,
                y: e.clientY,
                px: pan.x,
                py: pan.y,
              };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (drag.current)
                setPan({
                  x: drag.current.px + (e.clientX - drag.current.x),
                  y: drag.current.py + (e.clientY - drag.current.y),
                });
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
          >
            <svg
              className="campaign-graph"
              viewBox="0 0 1350 650"
              preserveAspectRatio="xMinYMin meet"
              role="group"
              aria-label="Interactive branching campaign graph"
            >
              <defs>
                <filter id="routeGlow">
                  <feGaussianBlur stdDeviation="3" />
                </filter>
                <radialGradient id="mapHalo">
                  <stop stopColor="#73bdcf" stopOpacity=".12" />
                  <stop offset="1" stopColor="#73bdcf" stopOpacity="0" />
                </radialGradient>
              </defs>
              <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
                <ellipse
                  cx="600"
                  cy="200"
                  rx="620"
                  ry="290"
                  fill="url(#mapHalo)"
                />
                <text x="100" y="35" className="region-label">
                  I / FIRST CONTACT
                </text>
                <text x="700" y="35" className="region-label">
                  II / UNDER PRESSURE
                </text>
                <text x="1050" y="35" className="region-label">
                  SLICE FINALE
                </text>
                {names.slice(2).map((name, i) => (
                  <text
                    key={name}
                    className="region-label future-label"
                    x={80 + (i % 3) * 430}
                    y={550 + Math.floor(i / 3) * 280}
                  >
                    {i + 3} / {name} · FUTURE
                  </text>
                ))}
                {edges.map(([a, b]) => {
                  const [x, y] = positions[a],
                    [xx, yy] = positions[b];
                  const enabled =
                    status(
                      missions.find((m) => m.id === a)!,
                      save,
                    ) === "Completed" &&
                    ["Available", "In progress", "Completed"].includes(
                      status(
                        missions.find((m) => m.id === b)!,
                        save,
                      ),
                    );
                  return (
                    <path
                      key={a + b}
                      className={`route-line ${enabled ? "lit" : ""}`}
                      d={`M${x + 40},${y} C${(x + xx) / 2},${y} ${(x + xx) / 2},${yy} ${xx - 40},${yy}`}
                    />
                  );
                })}
                {canonicalEdges
                  .filter(
                    (e) => !edges.some(([a, b]) => a === e.from && b === e.to),
                  )
                  .map((e) => {
                    const [x, y] = positions[e.from],
                      [xx, yy] = positions[e.to];
                    return (
                      <path
                        key={e.from + e.to}
                        className="route-line future-route"
                        strokeDasharray={e.optional ? "4 8" : undefined}
                        d={`M${x},${y + 25} C${x},${(y + yy) / 2} ${xx},${(y + yy) / 2} ${xx},${yy - 25}`}
                      />
                    );
                  })}
                {missions.map((m) => {
                  const [x, y] = positions[m.id],
                    s = status(m, save);
                  return (
                    <foreignObject
                      key={m.id}
                      x={x - 70}
                      y={y - 40}
                      width="140"
                      height="110"
                    >
                      <button
                        className={`map-node ${s.toLowerCase().replace(" ", "-")} ${selected === m.id ? "selected" : ""}`}
                        onClick={() => setSelected(m.id)}
                        onFocus={(e) => {
                          if (e.currentTarget.matches(":focus-visible")) {
                            setZoom(1);
                            setPan({ x: 0, y: y > 500 ? 300 - y : 0 });
                          }
                        }}
                        aria-label={`${m.id} ${m.playable ? m.title : "Uncharted case"} — ${s}`}
                      >
                        <span className="node-orb">
                          {s === "Completed"
                            ? "✓"
                            : s === "Locked"
                              ? "◇"
                              : s === "Alternate"
                                ? "↗"
                                : s === "Future"
                                  ? "·"
                                  : m.id}
                        </span>
                        <b>{m.playable ? m.title : "Uncharted case"}</b>
                        <small>{s}</small>
                      </button>
                    </foreignObject>
                  );
                })}
                <text x="760" y="350" className="slice-bridge">
                  B02 / B03 → slice convergence · later acts unavailable
                </text>
              </g>
            </svg>
          </div>
          <aside className="map-dossier glass" aria-label="Mission dossier">
            <span className="eyebrow">
              {dossier.id} / {status(dossier, save)}
            </span>
            <h2>{dossier.playable ? dossier.title : "Uncharted territory"}</h2>
            <p>
              {dossier.short_hook ??
                "This region belongs to a later campaign release. It cannot be played yet."}
            </p>
            {dossier.playable && (
              <>
                <div className="dossier-facts">
                  <span>
                    Inherited operating cost
                    <b>{cost(save.architecture)} credits</b>
                  </span>
                  <span>
                    Verification target
                    <b>
                      100 arrivals / {dossier.completion_conditions?.p95} ms
                    </b>
                  </span>
                </div>
                <p className="hint">
                  Your {save.architecture.capacity} workers per terminal,{" "}
                  {save.architecture.retries} retries and{" "}
                  {save.architecture.balance ? "least-loaded" : "affinity"}{" "}
                  routing carry forward.
                </p>
              </>
            )}
            {["Available", "In progress", "Completed"].includes(
              status(dossier, save),
            ) ? (
              <button className="primary full" onClick={() => launch(dossier)}>
                {status(dossier, save) === "Completed"
                  ? "Replay case"
                  : "Play case"}{" "}
                ↗
              </button>
            ) : status(dossier, save) === "Alternate" ? (
              <>
                <p>
                  Change specialization for 4 audit credits. Recorded cases
                  remain in History. Reserve: {save.reserve}.
                </p>
                <button
                  className="outline-button full"
                  onClick={() => {
                    try {
                      setSave((s) => switchBranch(s, dossier));
                    } catch (e) {
                      setNotice((e as Error).message);
                    }
                  }}
                >
                  Reopen alternate route
                </button>
              </>
            ) : (
              <p className="lock-reason">{whyLocked(dossier, save)}</p>
            )}
            <button className="text-button" onClick={() => setScreen("hq")}>
              Back to HQ
            </button>
          </aside>
          <footer className="map-toolbar glass">
            <div>
              <button
                aria-label="Zoom out"
                onClick={() => setZoom((v) => Math.max(0.5, v - 0.15))}
              >
                −
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button
                aria-label="Zoom in"
                onClick={() => setZoom((v) => Math.min(2, v + 0.15))}
              >
                +
              </button>
              <button
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
              >
                Fit map
              </button>
            </div>
            <p>
              Drag to pan · Tab to select · ✓ Completed · ◇ Locked · ↗ Alternate
            </p>
          </footer>
        </>
      )}
      {screen === "result" && result && (
        <section className="campaign-result glass">
          <span className="eyebrow">
            {result.ending ? "SYSTEM POSTMORTEM" : "CASE CLOSED"} / {result.id}
          </span>
          <h1>
            {result.ending
              ? endings.find((e) => e.id === result.ending)?.title
              : "Architecture recorded."}
          </h1>
          <p>
            {result.ending
              ? result.ending === "precision"
                ? "Your network met the final objectives with a lean operating footprint."
                : "You met the final objectives with additional operating headroom. Reliability has a measurable resource cost."
              : missions.find((m) => m.id === result.id)?.debrief}
          </p>
          <div className="result-numbers">
            <span>
              <b>{result.metrics.succeeded}/100</b>reliable arrivals
            </span>
            <span>
              <b>{result.metrics.p95}ms</b>tail latency
            </span>
            <span>
              <b>{result.cost}</b>operating credits
            </span>
            <span>
              <b>{result.experiments}</b>experiments
            </span>
          </div>
          <p>
            Recorded changes: {result.architecture.capacity} workers per
            terminal · {result.architecture.routing.filter(Boolean).length}{" "}
            routes · {result.architecture.retries} retries ·{" "}
            {result.architecture.queue_limit} queue slots.
          </p>
          <p className="new-routes">
            {available.length
              ? `Available next: ${available.map((m) => m.title).join(" / ")}`
              : "Slice completed. Replay a case or explore an alternate specialization."}
          </p>
          <div className="result-actions">
            <button
              className="primary"
              onClick={() => (available[0] ? launch(available[0]) : map())}
            >
              {available[0]
                ? "Next available case"
                : "Explore alternate routes"}
            </button>
            <button
              className="outline-button"
              onClick={() => launch(missions.find((m) => m.id === result.id)!)}
            >
              Replay case
            </button>
            <button className="outline-button" onClick={map}>
              Return to map
            </button>
          </div>
          {result.ending && (
            <p className="hint">
              2 endings playable in this slice. Four additional categories
              remain future content.
            </p>
          )}
        </section>
      )}
      {confirmNew && (
        <div className="campaign-modal">
          <section
            className="glass"
            role="dialog"
            aria-modal="true"
            aria-label="New campaign"
          >
            <h2>Start a new flight path?</h2>
            <p>
              This replaces campaign progress on this device. Replay preserves
              your history; New Campaign clears it.
            </p>
            <button
              className="primary"
              onClick={() => {
                setSave(fresh());
                setConfirmNew(false);
                setScreen("map");
                setSelected("A01");
              }}
            >
              Start new campaign
            </button>
            <button autoFocus onClick={() => setConfirmNew(false)}>
              Keep my progress
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
