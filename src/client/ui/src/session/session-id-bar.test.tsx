import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import SessionIdBar from "./session-id-bar";

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
