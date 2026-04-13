import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import SessionIdBar from "./session-id-bar";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/ui/src/session/session-id-bar.tsx"
);

test("SessionIdBar renders live usage limits from session status", () => {
  Object.assign(globalThis, { React: { createElement } });

  const html = renderToStaticMarkup(
    createElement(SessionIdBar, {
      binding: {
        providerSessionId: "3f4364a8-1234-5678-9012",
        status: "ready",
      },
      sessionId: "runtime-session-1",
      status: {
        providerSummary: "Claude",
        usageLimits: {
          currentSession: {
            percentUsed: 9,
            resetsAt: "2026-02-12T17:00:00.000Z",
          },
          currentWeekAllModels: {
            percentUsed: 12,
            resetsAt: "2026-02-15T07:00:00.000Z",
          },
          currentWeekSonnetOnly: null,
        },
        tokenUsage: { used: 0, limit: 200_000 },
        connectionState: "idle",
        continuityLock: { active: false, updatedAt: Date.now() },
        updatedAt: Date.now(),
      },
    })
  );

  assert.equal(html.includes("Session 9%"), true);
  assert.equal(html.includes("Weekly 12%"), true);
  assert.equal(html.includes("Resets"), true);
});

test("SessionIdBar does not invent usage limits without live status data", () => {
  Object.assign(globalThis, { React: { createElement } });

  const html = renderToStaticMarkup(
    createElement(SessionIdBar, {
      binding: {
        providerSessionId: "3f4364a8-1234-5678-9012",
        status: "ready",
      },
      sessionId: "runtime-session-2",
      status: {
        providerSummary: "Claude",
        tokenUsage: { used: 0, limit: 200_000 },
        connectionState: "idle",
        continuityLock: { active: false, updatedAt: Date.now() },
        updatedAt: Date.now(),
      },
    })
  );

  assert.equal(html.includes("Session 9%"), false);
  assert.equal(html.includes("Weekly 12%"), false);
  assert.equal(html.includes(">Session<"), true);
  assert.equal(html.includes(">Weekly<"), true);
});

test("SessionIdBar refresh effect waits for ready binding state", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(
    source.includes('binding.status === "ready"'),
    true,
    "usage limits refresh must not fire before binding becomes ready"
  );
  assert.equal(
    source.includes("binding.status,"),
    true,
    "usage limits refresh effect must rerun when binding status changes to ready"
  );
  assert.equal(
    source.includes("const rawProviderId = resolveRawProviderId(status);"),
    true,
    "usage limits refresh must resolve provider from live runtime status"
  );
  assert.equal(
    source.includes("providerId: rawProviderId,"),
    true,
    "usage limits refresh request must use the runtime provider identity"
  );
  assert.equal(
    source.includes("binding.providerSessionId,"),
    true,
    "usage limits refresh effect must rerun when the bound provider session changes"
  );
  assert.equal(
    source.includes("sessionId,"),
    true,
    "usage limits refresh effect must follow the active runtime session id"
  );
});
