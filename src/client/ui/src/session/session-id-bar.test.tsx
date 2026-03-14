import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import SessionIdBar from "./session-id-bar";
import { writeLastKnownUsageLimits } from "./usage-limits-cache";

const installMemoryStorage = (): void => {
  const state = new Map<string, string>();
  const storage = {
    get length() {
      return state.size;
    },
    clear() {
      state.clear();
    },
    getItem(key: string) {
      return state.has(key) ? (state.get(key) ?? null) : null;
    },
    key(index: number) {
      return [...state.keys()][index] ?? null;
    },
    removeItem(key: string) {
      state.delete(key);
    },
    setItem(key: string, value: string) {
      state.set(key, value);
    },
  } satisfies Storage;
  Object.assign(globalThis, { localStorage: storage });
};

test("SessionIdBar falls back to cached usage limits for same provider", () => {
  installMemoryStorage();
  Object.assign(globalThis, { React: { createElement } });
  writeLastKnownUsageLimits(
    "Claude",
    {
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
    "Claude"
  );

  const html = renderToStaticMarkup(
    createElement(SessionIdBar, {
      binding: {
        providerSessionId: "3f4364a8-1234-5678-9012",
        status: "ready",
      },
      status: {
        providerSummary: "Claude",
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
