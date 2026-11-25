import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import Game, { SceneBoundary } from "./Game";
import MissionConsole from "./MissionConsole";
import { Airport as Engine } from "./simulation";
import { fresh } from "./campaign";
import {
  newRun,
  configuration,
  verified,
  finishRun,
  operatingCost,
  endingNames,
  unlockedCapabilities,
  type Run,
} from "./director";
import {
  checkpoint,
  loadVault,
  saveVault,
  importCloud,
  vaultKey,
  type Vault,
} from "./persistence";
import * as cloud from "./cloud";
import { syncCheckpoint } from "./cloudSync";
import type { User } from "firebase/auth";
import "./campaign.css";
import "./headquarters.css";
const Airport = lazy(() => import("./Airport"));
const fallback = () => {
  const run = newRun();
  return { version: 3 as const, active: run.id, runs: [run] };
};
export default function Headquarters() {
  const [initial] = useState(() => {
    try {
      return { vault: loadVault(localStorage), blocked: false };
    } catch {
      return { vault: fallback(), blocked: true };
    }
  });
  const [blocked, setBlocked] = useState(initial.blocked);
  const [error, setError] = useState(
      initial.blocked
        ? "Existing save could not be read. It has been preserved. Export this session or explicitly clear local saves before storing new progress."
        : "",
    ),
    [vault, setVault] = useState<Vault>(initial.vault),
    [view, setView] = useState<
      "hq" | "game" | "archive" | "history" | "account" | "ending" | "classic"
    >("hq");
  const [user, setUser] = useState<User | null>(null),
    [remote, setRemote] = useState<Awaited<ReturnType<typeof cloud.listCloud>>>(
      [],
    ),
    [sync, setSync] = useState(false),
    [cloudRevision, setCloudRevision] = useState<number | null>(null),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(""),
    [reduced, setReduced] = useState(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    [localStatus, setLocalStatus] = useState("Saving on this device");
  useEffect(() => {
    if (!confirm) return;
    const previous = document.activeElement as HTMLElement | null;
    const listener = (e: KeyboardEvent) => {
      const d = document.querySelector(
        '[aria-label="Confirm campaign action"]',
      );
      if (e.key === "Escape") setConfirm("");
      if (e.key === "Tab" && d) {
        const buttons = Array.from(
          d.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
        );
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
    document.addEventListener("keydown", listener);
    return () => {
      document.removeEventListener("keydown", listener);
      previous?.focus();
    };
  }, [confirm]);
  const run = vault.runs.find((r) => r.id === vault.active)!;
  const world = useMemo(
    () => new Engine({ ...run.architecture, scenario: { count: 40 } }).view(),
    [run.architecture],
  );
  useEffect(() => {
    const m = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(m.matches);
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    try {
      if (blocked) {
        setLocalStatus("Existing save preserved");
        return;
      }
      saveVault(localStorage, vault);
      setLocalStatus("Saved on this device");
    } catch {
      setLocalStatus("Local save unavailable");
      setError(
        "Your browser could not save progress. Export your campaign before closing this tab.",
      );
    }
  }, [vault, blocked]);
  useEffect(
    () =>
      cloud.watchAuth((u) => {
        setUser(u);
        setSync(false);
        setRemote([]);
        setCloudRevision(null);
      }),
    [],
  );
  // Checkpoints only. No animation frames, live traces, polling or background listeners.
  useEffect(() => {
    if (!sync || !user) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void syncCheckpoint(run,cloudRevision,cloud.upload).then(result=>{
        if(cancelled)return;
        if(result.state==='synced')setCloudRevision(result.revision);
        else{setSync(false);setError(`${result.message} Your local save is safe.`);}
      });
    }, 2000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [run.id, run.revision, sync, user?.uid]);
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Operation failed. Local progress is safe.",
      );
    } finally {
      setBusy(false);
    }
  };
  const update = (r: Run) => setVault((v) => checkpoint(v, r));
  const exportSave = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(run, null, 2)], { type: "application/json" }),
    );
    a.download = `lost-in-transit-${run.id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const open = (r: Run) => {
    setSync(false);
    setCloudRevision(null);
    update(r);
    setView("hq");
  };
  if (view === "classic")
    return (
      <>
        <Game resetOriginal />
        <button className="classic-back" onClick={() => setView("hq")}>
          ← Headquarters
        </button>
      </>
    );
  if (view === "game")
    return (
      <Game
        key={`${run.id}:${run.current.id}`}
        missionConfig={configuration(run)}
        missionTitle={run.current.title}
        onMap={() => setView("hq")}
        renderControls={(s, command) => (
          <MissionConsole
            state={s}
            command={command}
            mission={run.current}
            save={{ ...fresh(), architecture: run.architecture }}
            onMap={() => setView("hq")}
            price={operatingCost}
            finalEvaluation={run.current.final}
            capabilities={unlockedCapabilities(run)}
            evaluate={(state, e) => verified(run.current, state, e)}
            onComplete={(state, e, n, severe) => {
              const next = finishRun(run, state, e, n, !!severe);
              update(next);
              setView(next.ending ? "ending" : "hq");
            }}
          />
        )}
      />
    );
  return (
    <main
      className={`campaign-shell headquarters ${reduced ? "reduce-motion" : ""}`}
    >
      <header className="campaign-header">
        <button className="campaign-brand" onClick={() => setView("hq")}>
          <span className="brand-glyph">↗</span>
          <span>
            Lost in Transit<small>AIRPORT HEADQUARTERS</small>
          </span>
        </button>
        <nav>
          <button onClick={() => setView("hq")}>Headquarters</button>
          <button onClick={() => setView("history")}>History</button>
          <button onClick={() => setView("archive")}>Saved campaigns</button>
          <button onClick={() => setView("account")}>
            {user ? "Account" : "Guest"}
          </button>
        </nav>
        <span className="saved-indicator">
          {sync ? "Cloud sync enabled" : localStatus}
        </span>
      </header>
      {error && (
        <div className="campaign-notice glass" role="alert">
          {error}
          <button onClick={() => setError("")}>Dismiss</button>
        </div>
      )}
      {view === "hq" && (
        <>
          <div className="hq-airport">
            <SceneBoundary>
              <Suspense fallback={null}>
                <Airport
                  state={world}
                  landing={false}
                  reduced={reduced}
                  onGate={() => setView("history")}
                  onRequest={() => {}}
                  reset={0}
                  follow={null}
                />
              </Suspense>
            </SceneBoundary>
          </div>
          <section className="hq-copy">
            <span className="eyebrow">YOUR AIRPORT / LIVE OPERATIONS</span>
            <h1>
              The world
              <br />
              is <em>unfolding.</em>
            </h1>
            <p>
              {run.ending
                ? "The departure inspection is complete. Your decisions have left their mark."
                : run.current.short_hook}
            </p>
            <div className="hq-actions">
              <button
                className="primary"
                onClick={() => setView(run.ending ? "ending" : "game")}
              >
                {run.ending
                  ? "View retrospective"
                  : run.outcomes.length
                    ? "Continue campaign"
                    : "Play as Guest"}{" "}
                ↗
              </button>
              <button
                className="outline-button"
                onClick={() => setView("account")}
              >
                {user ? "Manage cloud saves" : "Continue with Google"}
              </button>
            </div>
            <div className="hq-progress">
              <span>
                {run.outcomes.length}
                <small>INCIDENTS RESOLVED</small>
              </span>
              <span>
                {operatingCost(run.architecture)}
                <small>OPERATING CREDITS</small>
              </span>
              <span>
                {run.architecture.capacity *
                  run.architecture.routing.filter(Boolean).length}
                <small>ACTIVE WORKERS</small>
              </span>
            </div>
          </section>
          <section className="dispatch glass">
            <span className="eyebrow">
              {run.ending ? "CURRENT OBJECTIVE" : "INCOMING INCIDENT"}
            </span>
            <h2>
              {run.ending ? "Review your flight path" : run.current.title}
            </h2>
            <p>
              {run.ending
                ? "Start another campaign to explore a different airport."
                : "Observe the traffic. Follow the evidence."}
            </p>
            <small>
              Discovered services ·{" "}
              {run.architecture.routing
                .map((v, i) => (v ? "ABC"[i] : null))
                .filter(Boolean)
                .join(" / ")}
            </small>
          </section>
          <footer className="hq-footer glass">
            <p>
              Your infrastructure carries forward. The next incident is not yet
              known.
            </p>
            <button onClick={() => setView("classic")}>
              Original sandbox ↗
            </button>
            <button onClick={() => setConfirm("new")}>New campaign</button>
          </footer>
        </>
      )}
      {view === "history" && (
        <section className="hq-page">
          <span className="eyebrow">OPERATIONS JOURNAL</span>
          <h1>Your flight path</h1>
          {!run.outcomes.length && (
            <p>
              No incidents recorded yet. Investigate the current departure
              stream.
            </p>
          )}
          <div className="journal">
            {run.outcomes.map((o) => (
              <article className="glass" key={o.id}>
                <h2>
                  {o.id} · {o.family}
                </h2>
                <p>
                  {o.metrics.succeeded}/{o.metrics.created} arrivals ·{" "}
                  {o.metrics.p95} ms · {o.cost} credits
                </p>
                <p>
                  {o.architecture.capacity} workers per service ·{" "}
                  {o.architecture.retries} retries · {o.evidence.length}{" "}
                  diagnostic probes
                </p>
                <details>
                  <summary>Technical record</summary>
                  <p>
                    Reproduction seed {o.seed}. {o.experiments} experiments.
                    Correct payloads {o.metrics.correct ?? o.metrics.succeeded}.{" "}
                    {o.severe ? "Recovered after a severe test failure." : ""}
                  </p>
                </details>
              </article>
            ))}
          </div>
          {run.legacy && (
            <details>
              <summary>Preserved earlier campaign history</summary>
              {run.legacy.history.map((h) => (
                <p key={h.id}>
                  {h.id} · {h.metrics.succeeded} arrivals · {h.metrics.p95} ms
                </p>
              ))}
            </details>
          )}
        </section>
      )}
      {view === "archive" && (
        <section className="hq-page">
          <h1>Saved campaigns</h1>
          <p>
            Up to 20 campaigns on this device. Export a copy before clearing
            local data.
          </p>
          <button onClick={() => setConfirm("new")}>New campaign</button>
          <button onClick={exportSave}>Export current campaign</button>
          <label className="import-save">
            Import campaign
            <input
              type="file"
              accept="application/json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file)
                  void act(async () => {
                    const next = importCloud(
                      vault,
                      JSON.parse(await file.text()),
                    );
                    setVault(next);
                    setSync(false);
                  });
              }}
            />
          </label>
          <div className="journal">
            {vault.runs.map((r) => (
              <article className="glass" key={r.id}>
                <h2>
                  {new Date(r.createdAt).toLocaleDateString()} ·{" "}
                  {r.outcomes.length} incidents
                </h2>
                <p>
                  {r.ending ? endingNames[r.ending] : "Campaign in progress"}
                </p>
                <button onClick={() => open(r)}>Continue campaign</button>
                <button onClick={() => setConfirm(`remove:${r.id}`)}>
                  Remove local copy
                </button>
              </article>
            ))}
          </div>
          <h2>Endings discovered</h2>
          {[...new Set(vault.runs.map((r) => r.ending).filter(Boolean))].map(
            (e) => (
              <p key={e}>{endingNames[e!]}</p>
            ),
          )}
        </section>
      )}
      {view === "account" && (
        <section className="hq-page account-panel glass">
          <h1>{user ? "Your cloud saves" : "Play your way"}</h1>
          <p>
            Guest progress stays on this device. Optional Google sign-in lets
            you keep a copy across devices. No analytics or advertising.
          </p>
          {!cloud.configured && (
            <p role="status">
              Cloud saves are not configured on this deployment. Guest play and
              local exports work without Firebase.
            </p>
          )}
          {!user ? (
            <>
              <button
                disabled={!cloud.configured || busy}
                onClick={() => void act(cloud.login)}
              >
                Continue with Google
              </button>
              <button onClick={() => setView("hq")}>Play as Guest</button>
            </>
          ) : (
            <>
              <p>
                Signed in. Local progress is never uploaded until you choose to
                keep it.
              </p>
              <button
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    const items = await cloud.listCloud();
                    setRemote(items);
                  })
                }
              >
                Load cloud campaigns
              </button>
              <button
                disabled={busy || sync}
                onClick={() =>
                  void act(async () => {
                    const rev = await cloud.upload(run, null);
                    setCloudRevision(rev);
                    setSync(true);
                  })
                }
              >
                Keep this campaign in my account
              </button>
              <button
                onClick={() => {
                  setSync(false);
                  open({
                    ...run,
                    id: crypto.randomUUID(),
                    revision: 0,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  });
                }}
              >
                Keep local changes as a separate campaign
              </button>
              {remote.map(({ run: r, revision }) => (
                <article key={r.id}>
                  <p>
                    {new Date(r.updatedAt).toLocaleString()} ·{" "}
                    {r.outcomes.length} incidents
                  </p>
                  <button
                    onClick={() => {
                      open(r);
                      setCloudRevision(revision);
                      setSync(true);
                    }}
                  >
                    Resume cloud copy
                  </button>
                  <button onClick={() => setConfirm(`cloud:${r.id}`)}>
                    Delete cloud copy
                  </button>
                </article>
              ))}
              <button onClick={() => void act(cloud.logout)}>Sign Out</button>
              <button onClick={() => setConfirm("account")}>
                Delete account and cloud data
              </button>
            </>
          )}
          <button onClick={() => setConfirm("clear")}>
            Clear all local saves
          </button>
        </section>
      )}
      {view === "ending" && (
        <section className="campaign-result glass ending-sequence">
          <span className="eyebrow">DEPARTURE INSPECTION COMPLETE</span>
          <h1>{endingNames[run.ending ?? ""]}</h1>
          <p>
            Your architecture was tested across three mixed workloads. This is
            the record of what it delivered.
          </p>
          <div className="result-numbers">
            {run.outcomes
              .filter((o) => o.final)
              .map((o) => (
                <div key={o.id}>
                  <b>
                    {o.metrics.succeeded}/{o.metrics.created}
                  </b>
                  <small>
                    {o.metrics.correct ?? o.metrics.succeeded} correct ·{" "}
                    {o.metrics.p95} ms · {o.cost} credits
                  </small>
                </div>
              ))}
          </div>
          <button className="primary" onClick={() => setView("history")}>
            Technical retrospective
          </button>
          <button onClick={() => setConfirm("new")}>
            Begin another flight path
          </button>
        </section>
      )}
      {confirm && (
        <div className="campaign-modal-backdrop">
          <section
            className="glass campaign-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Confirm campaign action"
          >
            <h2>
              {confirm === "new"
                ? "Begin a new campaign?"
                : "Confirm data removal"}
            </h2>
            <p>
              {confirm === "new"
                ? "Your current campaign remains in Saved campaigns. A new seed creates a different journey."
                : confirm === "account"
                  ? "This deletes your cloud saves and Google-linked game account. Google itself is not deleted. Recent sign-in may be required."
                  : "This removes the selected saved data. Export any local progress you want to keep first."}
            </p>
            <button onClick={() => setConfirm("")} autoFocus>
              Cancel
            </button>
            <button
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  if (confirm === "new") {
                    if (vault.runs.length >= 20)
                      throw Error(
                        "Archive full. Remove an older campaign first.",
                      );
                    open(newRun());
                  } else if (confirm === "clear") {
                    localStorage.removeItem(vaultKey);
                    setBlocked(false);
                    localStorage.removeItem("lost-in-transit.campaign.v2");
                    setSync(false);
                    setVault(fallback());
                    setView("hq");
                  } else if (confirm === "account") {
                    await cloud.deleteAccount();
                    setSync(false);
                  } else if (confirm.startsWith("cloud:")) {
                    await cloud.removeCloud(confirm.slice(6));
                    setRemote(await cloud.listCloud());
                    setSync(false);
                  } else {
                    const runs = vault.runs.filter(
                      (r) => r.id !== confirm.slice(7),
                    );
                    setSync(false);
                    setVault(
                      runs.length
                        ? { version: 3, active: runs[0].id, runs }
                        : fallback(),
                    );
                  }
                  setConfirm("");
                })
              }
            >
              Confirm
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
