import assert from "node:assert/strict";
import test from "node:test";
import { extractUsageLimitsFromRateLimitHeaders } from "./claude-usage-limits-snapshot";

const toHeaderMap = (
  payload: Record<string, string>
): ReadonlyMap<string, string> => {
  const map = new Map<string, string>();
  for (const [key, value] of Object.entries(payload)) {
    map.set(key.toLowerCase(), value);
  }
  return map;
};

test("extractUsageLimitsFromRateLimitHeaders supports utilization headers", () => {
  const snapshot = extractUsageLimitsFromRateLimitHeaders(
    toHeaderMap({
      "anthropic-ratelimit-unified-5h-utilization": "0.06",
      "anthropic-ratelimit-unified-5h-reset": "1770915600",
      "anthropic-ratelimit-unified-7d-utilization": "12",
      "anthropic-ratelimit-unified-7d-reset": "1771138800",
    })
  );

  assert.ok(snapshot);
  assert.equal(snapshot.currentSession?.percentUsed, 6);
  assert.equal(snapshot.currentWeekAllModels?.percentUsed, 12);
  assert.equal(
    snapshot.currentSession?.resetsAt,
    new Date(1_770_915_600 * 1000).toISOString()
  );
  assert.equal(
    snapshot.currentWeekAllModels?.resetsAt,
    new Date(1_771_138_800 * 1000).toISOString()
  );
  assert.equal(snapshot.currentWeekSonnetOnly, null);
});

test("extractUsageLimitsFromRateLimitHeaders keeps limit/remaining fallback", () => {
  const snapshot = extractUsageLimitsFromRateLimitHeaders(
    toHeaderMap({
      "anthropic-ratelimit-unified-5h-limit": "100",
      "anthropic-ratelimit-unified-5h-remaining": "63",
      "anthropic-ratelimit-unified-7d-limit": "1000",
      "anthropic-ratelimit-unified-7d-remaining": "120",
    })
  );

  assert.ok(snapshot);
  assert.equal(snapshot.currentSession?.percentUsed, 37);
  assert.equal(snapshot.currentWeekAllModels?.percentUsed, 88);
});

test("extractUsageLimitsFromRateLimitHeaders returns null without usable buckets", () => {
  const snapshot = extractUsageLimitsFromRateLimitHeaders(
    toHeaderMap({
      "anthropic-ratelimit-unified-5h-status": "allowed",
      "anthropic-ratelimit-unified-7d-status": "allowed",
    })
  );

  assert.equal(snapshot, null);
});
