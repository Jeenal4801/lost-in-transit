import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { Airport } from "../.test-build/simulation.js";
const fixtures = JSON.parse(
  fs.readFileSync(new URL("./parity.json", import.meta.url)),
);
for (const f of fixtures)
  test(`Python parity: ${f.name}, every frame and request trace`, () => {
    const a = new Airport();
    for (const [k, v] of f.commands) a.command(k, v);
    a.command("play");
    for (const expected of f.frames) {
      a.tick();
      assert.deepEqual(a.view(), expected);
    }
    assert.equal(a.heap.length, 0);
  });
test("repair, pause, step, replay, mutation guard and restart", () => {
  const a = new Airport();
  a.command("play");
  while (a.heap.length) a.tick();
  assert.equal(a.metrics().succeeded, 73);
  a.command("online", [2, true]);
  a.command("rerun");
  assert.equal(a.baseline.succeeded, 73);
  a.command("pause");
  const t = a.time;
  a.tick();
  assert.equal(a.time, t);
  a.command("step");
  assert.equal(a.requests.size, 1);
  a.command("play");
  while (a.heap.length) a.tick();
  assert.equal(a.metrics().succeeded, 100);
  const live = a.view();
  a.command("seek", 0);
  assert.equal(a.view().metrics.created, 0);
  assert.throws(() => a.command("online", [2, false]));
  a.command("play_replay");
  a.tick();
  assert.equal(a.replaying, 1);
  a.command("live");
  assert.deepEqual(a.view().metrics, live.metrics);
  a.command("reset");
  assert.equal(a.config.online[2], false);
  assert.equal(a.baseline, null);
  assert.throws(() => a.command("online", [3, true]));
});
