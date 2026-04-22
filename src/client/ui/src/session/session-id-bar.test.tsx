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
  assert.equal(html.includes("Session 9% (Resets"), true);
  assert.equal(html.includes("Weekly 12% (Resets"), true);
});

test("SessionIdBar renders loading labels when provider usage telemetry is pending", () => {
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
  assert.equal(html.includes("Session ..."), true);
  assert.equal(html.includes("Weekly ..."), true);
  assert.equal(html.includes("unavailable"), false);
});

test("SessionIdBar stays display-only and resolves pending labels from session status", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(
    source.includes("useEffect"),
    false,
    "usage limits bar must stay display-only"
  );
  assert.equal(
    source.includes("onRefreshUsageLimits({"),
    false,
    "usage limits bar must not trigger transport refresh on mount"
  );
  assert.equal(
    source.includes("const resolveUsageLabelState ="),
    true,
    "pending label state must be derived from current session status"
  );
  assert.equal(
    source.includes('row.labelState === "loading" ? "..." : "unavailable"'),
    true,
    "pending and unavailable labels must stay explicit without inventing percentages"
  );
});
