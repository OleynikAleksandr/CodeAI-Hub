import assert from "node:assert/strict";
import test from "node:test";
import { extractLatestUsageLimitsFromRollout } from "./codex-usage-limits-snapshot";

test("extractLatestUsageLimitsFromRollout parses primary/secondary rate_limits", () => {
  const snapshot = extractLatestUsageLimitsFromRollout([
    {
      type: "event_msg",
      payload: {
        type: "token_count",
        rate_limits: {
          primary: {
            used_percent: 2.4,
            resets_at: 1_770_937_534,
          },
          secondary: {
            used_percent: 80,
            resets_at: "1771266960",
          },
        },
      },
    },
  ]);

  assert.ok(snapshot);
  assert.equal(snapshot.currentSession?.percentUsed, 2);
  assert.equal(
    snapshot.currentSession?.resetsAt,
    new Date(1_770_937_534 * 1000).toISOString()
  );
  assert.equal(snapshot.currentWeekAllModels?.percentUsed, 80);
  assert.equal(
    snapshot.currentWeekAllModels?.resetsAt,
    new Date(1_771_266_960 * 1000).toISOString()
  );
  assert.equal(snapshot.currentWeekSonnetOnly, null);
});

test("extractLatestUsageLimitsFromRollout clamps percent and keeps latest token_count", () => {
  const snapshot = extractLatestUsageLimitsFromRollout([
    {
      type: "event_msg",
      payload: {
        type: "token_count",
        rate_limits: {
          primary: { used_percent: 10, resets_at: null },
          secondary: { used_percent: 20, resets_at: null },
        },
      },
    },
    {
      type: "event_msg",
      payload: {
        type: "token_count",
        rate_limits: {
          primary: { used_percent: 102.2, resets_at: null },
          secondary: { used_percent: "-2", resets_at: null },
        },
      },
    },
  ]);

  assert.ok(snapshot);
  assert.equal(snapshot.currentSession?.percentUsed, 100);
  assert.equal(snapshot.currentWeekAllModels?.percentUsed, 0);
});

test("extractLatestUsageLimitsFromRollout returns null without usable rate_limits", () => {
  const snapshot = extractLatestUsageLimitsFromRollout([
    { type: "event_msg", payload: { type: "token_count", rate_limits: {} } },
    { type: "event_msg", payload: { type: "agent_message", message: "ok" } },
  ]);

  assert.equal(snapshot, null);
});
