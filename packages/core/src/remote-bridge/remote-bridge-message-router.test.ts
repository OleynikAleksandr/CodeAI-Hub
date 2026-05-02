import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const INDEX_SOURCE_PATH = path.resolve(
  process.cwd(),
  "packages/core/src/remote-bridge/index.ts"
);
const ROUTER_SOURCE_PATH = path.resolve(
  process.cwd(),
  "packages/core/src/remote-bridge/remote-bridge-message-router.ts"
);
const TYPES_SOURCE_PATH = path.resolve(
  process.cwd(),
  "packages/core/src/remote-bridge/types.ts"
);

test("RemoteBridgeMessageRouter exposes native request capture command and result", async () => {
  const [indexSource, routerSource, typesSource] = await Promise.all([
    readFile(INDEX_SOURCE_PATH, "utf8"),
    readFile(ROUTER_SOURCE_PATH, "utf8"),
    readFile(TYPES_SOURCE_PATH, "utf8"),
  ]);

  assert.equal(
    indexSource.includes("new NativeRequestCaptureFacade({"),
    true,
    "RemoteBridge must wire the capture facade with provider registry"
  );
  assert.equal(
    routerSource.includes('case "settings:native-request-capture":'),
    true,
    "message router must handle capture commands"
  );
  assert.equal(
    routerSource.includes('type: "settings:native-request-capture:result"'),
    true,
    "message router must return capture result events"
  );
  assert.equal(
    typesSource.includes('readonly type: "settings:native-request-capture"'),
    true,
    "incoming bridge contract must include capture command"
  );
  assert.equal(
    routerSource.includes("reasoning: readOptionalString(payload.reasoning)"),
    true,
    "message router must pass capture reasoning override to the facade"
  );
  assert.equal(
    typesSource.includes("readonly reasoning?: string | null"),
    true,
    "incoming bridge contract must include capture reasoning override"
  );
  assert.equal(
    typesSource.includes(
      'readonly type: "settings:native-request-capture:result"'
    ),
    true,
    "bridge event contract must include capture result"
  );
});

test("RemoteBridgeMessageRouter exposes template update commands and results", async () => {
  const [routerSource, typesSource] = await Promise.all([
    readFile(ROUTER_SOURCE_PATH, "utf8"),
    readFile(TYPES_SOURCE_PATH, "utf8"),
  ]);

  assert.equal(
    routerSource.includes('case "settings:template-updates":'),
    true,
    "message router must handle template update listing"
  );
  assert.equal(
    routerSource.includes('case "settings:template-update:resolve":'),
    true,
    "message router must handle template update resolution"
  );
  assert.equal(
    typesSource.includes('readonly type: "settings:template-updates"'),
    true,
    "incoming bridge contract must include template update listing"
  );
  assert.equal(
    typesSource.includes(
      'readonly type: "settings:template-update:resolve:result"'
    ),
    true,
    "bridge event contract must include template update resolution result"
  );
});
