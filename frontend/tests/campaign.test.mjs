import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { Airport } from "../.test-build/frontend/src/simulation.js";
import {
  missions,
  fresh,
  decode,
  status,
  configFor,
  complete,
  passed,
  switchBranch,
  cost,
} from "../.test-build/frontend/src/campaign.js";
const data = [...JSON.parse(
  fs.readFileSync(new URL("./campaign-parity.json", import.meta.url)),
),...JSON.parse(fs.readFileSync(new URL("./procedural-parity.json", import.meta.url)))];
const canonical = (x) =>
  Array.isArray(x)
    ? x.map(canonical)
    : x && typeof x === "object"
      ? Object.fromEntries(
          Object.keys(x)
            .sort()
            .map((k) => [k, canonical(x[k])]),
        )
      : x;
for (const f of data)
  test(`Campaign Python parity ${f.id}/${f.label}`, () => {
    const a = new Airport(f.config);
    a.command("play");
    for (const hash of f.hashes) {
      a.tick();
      assert.equal(
        createHash("sha256")
          .update(JSON.stringify(canonical(a.view())))
          .digest("hex"),
        hash,
        `frame at ${a.time}`,
      );
    }
    assert.deepEqual(a.metrics(), f.metrics);
    assert.equal(a.heap.length, 0);
  });
const run = (config) => {
  const a = new Airport(config);
  a.command("play");
  while (a.heap.length) a.tick();
  return a.view();
};
for (const [name, first, pressure, capacity, ending] of [
  ["lean", "A03", "B02", 6, "precision"],
  ["provisioned", "A04", "B03", 8, "headroom"],
  ["routing", "A04", "B02", 6, "precision"],
])
  test(`Reachable ending through ${name} route with persistent decisions`, () => {
    let s = fresh();
    for (const id of ["A01", "A02", first, "B01", pressure, "S01"]) {
      const m = missions.find((m) => m.id === id);
      assert.equal(status(m, s), "Available");
      const inherited = configFor(m, s);
      if (id === "S01") assert.equal(inherited.capacity, 6);
      const config = { ...inherited, online: [true, true, true] };
      if (id === "A02")
        Object.assign(config, {
          capacity: 4,
          accelerated: true,
          balance: true,
        });
      if (id === "A03") config.retries = 1;
      if (id === "A04") config.normalize_headers = true;
      if (id === "B01")
        Object.assign(config, {
          capacity: 4,
          queue_limit: 24,
          retries: 1,
          normalize_headers: true,
          routing: [true, true, true],
        });
      if (id === "B02" || id === "B03") config.capacity = 6;
      if (id === "S01") config.capacity = capacity;
      if (name === "routing" && id === "A04")
        Object.assign(config, {
          routing: [true, false, true],
          normalize_headers: false,
        });
      const state = run(config);
      assert.ok(passed(m, state, ["trace", "distribution"]));
      s = complete(s, m, state, ["trace", "distribution"], 2);
      assert.deepEqual(decode(JSON.stringify(s)), s);
    }
    assert.equal(s.ending, ending);
    assert.ok(s.history.every((h) => h.metrics.succeeded === 100));
  });
test("Guards, alternatives, remedial audit and future nodes", () => {
  let s = fresh();
  assert.equal(
    status(
      missions.find((m) => m.id === "A02"),
      s,
    ),
    "Locked",
  );
  s.history = [{ id: "A02", evidence: [], metrics: {} }];
  assert.equal(
    status(
      missions.find((m) => m.id === "A04"),
      s,
    ),
    "Locked",
  );
  s.history[0].evidence = ["trace"];
  assert.equal(
    status(
      missions.find((m) => m.id === "A04"),
      s,
    ),
    "Available",
  );
  s.choices.contact = "A03";
  const m = missions.find((m) => m.id === "A04");
  assert.equal(status(m, s), "Alternate");
  s = switchBranch(s, m);
  assert.equal(s.reserve, 8);
  assert.equal(status(m, s), "Available");
  s.choices.contact = "A03";
  s.reserve = 0;
  assert.throws(() => switchBranch(s, m));
  assert.equal(missions.filter((m) => m.playable).length, 8);
  assert.equal(missions.filter((m) => m.id !== "S01").length, 42);
  for (const m of missions.filter((m) => !m.playable))
    assert.equal(status(m, s), "Future");
});
test("Corrupt and older saves are recoverable, new game is independent", () => {
  assert.deepEqual(decode("bad json"), fresh());
  assert.deepEqual(decode('{"version":1}'), fresh());
  assert.deepEqual(
    decode(JSON.stringify({ ...fresh(), architecture: { capacity: -1 } })),
    fresh(),
  );
  const s = fresh();
  s.architecture.routing[0] = false;
  assert.equal(fresh().architecture.routing[0], true);
});
test("Failed or unrelated workloads cannot close a campaign case", () => {
  const m = missions.find((m) => m.id === "A02"),
    s = fresh();
  assert.throws(() => complete(s, m, run(configFor(m, s)), ["trace"], 1));
  const a = new Airport();
  a.config.online = [true, true, true];
  while (a.heap.length) a.advance();
  assert.equal(passed(m, a.view(), ["trace"]), false);
});
test("Every playable branch has a legal path to the slice finale", () => {
  for (const first of ["A03", "A04"])
    for (const pressure of ["B02", "B03"]) {
      let s = fresh();
      for (const id of ["A01", "A02", first, "B01", pressure, "S01"]) {
        const m = missions.find((m) => m.id === id);
        assert.ok(["Available", "In progress"].includes(status(m, s)));
        s.history.push({ id, evidence: ["trace", "distribution"] });
        if (m.exclusive_group) s.choices[m.exclusive_group] = id;
      }
      assert.equal(
        status(
          missions.find((m) => m.id === "S01"),
          s,
        ),
        "Completed",
      );
    }
});

test('Architecture guards always leave a pressure specialization reachable',()=>{
 for(const balance of [true,false])for(const queue_limit of [0,8,16,40]){
  const s=fresh();s.architecture.balance=balance;s.architecture.queue_limit=queue_limit;s.history=[{id:'B01',evidence:[]}];
  assert.ok(['B02','B03'].some(id=>status(missions.find(m=>m.id===id),s)==='Available'));
 }
});
