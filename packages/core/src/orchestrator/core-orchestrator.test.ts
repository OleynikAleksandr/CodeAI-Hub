import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "packages/core/src/orchestrator/core-orchestrator.ts"
);

test("CoreOrchestrator opens the remote bridge before provider warmup completes", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");
  const autoUpdateIndex = source.indexOf(
    "await this.providerAutoUpdateService.runStartupAutoUpdate();"
  );
  const warmupPendingIndex = source.indexOf(
    "this.providerRegistry.markStartupWarmupPending();"
  );
  const providerInitializeIndex = source.indexOf(
    "await this.providerRegistry.initialize();"
  );
  const bridgeStartIndex = source.indexOf("await this.remoteBridge.start();");

  assert.notEqual(autoUpdateIndex, -1);
  assert.notEqual(warmupPendingIndex, -1);
  assert.notEqual(providerInitializeIndex, -1);
  assert.notEqual(bridgeStartIndex, -1);
  assert.ok(autoUpdateIndex < warmupPendingIndex);
  assert.ok(warmupPendingIndex < bridgeStartIndex);
  assert.ok(bridgeStartIndex < providerInitializeIndex);
});
