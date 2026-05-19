import assert from "node:assert/strict";
import test from "node:test";
import { ProviderUsageLimitsCompatAdapter } from "./provider-usage-limits-compat-adapter";
import { buildProviderUsageLimitsStreamPayload } from "./provider-usage-limits-stream-event";
import type { ProviderUsageLimitsSnapshot } from "./provider-usage-limits-types";

test("buildProviderUsageLimitsStreamPayload preserves Kimi 5h and weekly window semantics", () => {
  const snapshot: ProviderUsageLimitsSnapshot = {
    collectedAt: "2026-05-19T12:00:00.000Z",
    providerId: "kimi",
    providerScopeKey: "kimi:global",
    source: "kimi_unavailable",
    windows: [
      {
        id: "primary",
        label: "5h",
        percentUsed: 9,
        resetsAt: "2026-05-19T12:50:12.630Z",
        windowKind: "provider-specific",
      },
      {
        id: "secondary",
        label: "Weekly",
        percentUsed: 13,
        resetsAt: "2026-05-23T11:50:12.630Z",
        windowKind: "weekly",
      },
    ],
  };
  const compat = new ProviderUsageLimitsCompatAdapter().toCompat(snapshot);

  const payload = buildProviderUsageLimitsStreamPayload({
    compat,
    snapshot,
  });

  assert.equal(payload?.providerScopeKey, "kimi:global");
  assert.equal(payload?.usageLimits?.currentSession?.percentUsed, 9);
  assert.equal(
    payload?.usageLimits?.currentSession?.resetsAt,
    "2026-05-19T12:50:12.630Z"
  );
  assert.equal(payload?.usageLimits?.currentWeekAllModels?.percentUsed, 13);
  assert.equal(
    payload?.usageLimits?.currentWeekAllModels?.resetsAt,
    "2026-05-23T11:50:12.630Z"
  );
  assert.equal(payload?.usageLimits?.currentWeekSonnetOnly, null);
  assert.deepEqual(payload?.data.usageLimitLabels, {
    currentSession: "5h",
    currentWeekAllModels: "Weekly",
  });
});
