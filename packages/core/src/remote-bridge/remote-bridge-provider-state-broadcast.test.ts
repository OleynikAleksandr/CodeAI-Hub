import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "packages/core/src/remote-bridge/index.ts"
);
const CORE_STATE_BROADCAST_RE =
  /this\.broadcast\(\{\s+type: "core:state",\s+payload: this\.buildInitialState\(\),\s+\}\);/u;

test("RemoteBridge rebroadcasts Core state after provider status changes", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");
  const providerGuardIndex = source.indexOf('event.phase === "provider"');
  const loadingStatusIndex = source.indexOf(
    'this.broadcast({ type: "core:loading-status", payload: event });'
  );
  const stateBroadcastMatch = CORE_STATE_BROADCAST_RE.exec(source);
  const stateBroadcastIndex = stateBroadcastMatch?.index ?? -1;

  assert.notEqual(providerGuardIndex, -1);
  assert.notEqual(loadingStatusIndex, -1);
  assert.notEqual(stateBroadcastIndex, -1);
  assert.ok(loadingStatusIndex < providerGuardIndex);
  assert.ok(providerGuardIndex < stateBroadcastIndex);
});
