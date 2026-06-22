import assert from "node:assert/strict";
import test from "node:test";
import { readGlmUsageLimits } from "./glm-usage-limits-reader";

const SESSION_RESET_MS = 1_781_816_712_109;
const WEEKLY_RESET_MS = 1_782_363_374_989;

// Real response captured from the user's account (2026-06-18). Bucket order is
// intentionally TIME_LIMIT-first to prove classification is not positional.
const SAMPLE_RESPONSE = {
  code: 200,
  success: true,
  data: {
    level: "pro",
    limits: [
      {
        type: "TIME_LIMIT",
        unit: 5,
        number: 1,
        percentage: 1,
        nextResetTime: 1_784_350_574_995,
      },
      {
        type: "TOKENS_LIMIT",
        unit: 3,
        number: 5,
        percentage: 2,
        nextResetTime: SESSION_RESET_MS,
      },
      {
        type: "TOKENS_LIMIT",
        unit: 6,
        number: 1,
        percentage: 15,
        nextResetTime: WEEKLY_RESET_MS,
      },
    ],
  },
};

const withMockFetch = async (
  impl: (url: unknown, init?: unknown) => Promise<unknown>,
  run: () => Promise<void>
): Promise<void> => {
  const original = globalThis.fetch;
  globalThis.fetch = impl as unknown as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = original;
  }
};

test("classifies 5h and weekly by (type, unit) and drops TIME_LIMIT", async () => {
  await withMockFetch(
    () =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(SAMPLE_RESPONSE),
      }),
    async () => {
      const payload = await readGlmUsageLimits({
        apiKey: "key",
        baseUrl: "https://api.z.ai/api/coding/paas/v4",
      });
      assert.ok(payload);
      assert.equal(payload?.providerScopeKey, "glmNative:global");
      assert.equal(payload?.usageLimits.currentSession?.percentUsed, 2);
      assert.equal(payload?.usageLimits.currentWeekAllModels?.percentUsed, 15);
      assert.equal(
        payload?.usageLimits.currentSession?.resetsAt,
        new Date(SESSION_RESET_MS).toISOString()
      );
      assert.equal(payload?.data.usageLimitLabels.currentSession, "5h");
      assert.equal(
        payload?.data.usageLimitLabels.currentWeekAllModels,
        "Weekly"
      );
      assert.equal(payload?.data.kind, "usage_limits");
      assert.equal(payload?.data.source, "glm_monitor");
    }
  );
});

test("hits monitor origin with a bare Authorization header (no Bearer)", async () => {
  let capturedUrl = "";
  let capturedAuth = "";
  await withMockFetch(
    (url, init) => {
      capturedUrl = String(url);
      const headers = (init as { headers?: Record<string, string> } | undefined)
        ?.headers;
      capturedAuth = headers?.Authorization ?? "";
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(SAMPLE_RESPONSE),
      });
    },
    async () => {
      await readGlmUsageLimits({
        apiKey: "secret-key",
        baseUrl: "https://api.z.ai/api/coding/paas/v4",
      });
      assert.equal(
        capturedUrl,
        "https://api.z.ai/api/monitor/usage/quota/limit"
      );
      assert.equal(capturedAuth, "secret-key");
    }
  );
});

test("returns null when the api key is missing", async () => {
  const payload = await readGlmUsageLimits({
    apiKey: null,
    baseUrl: "https://api.z.ai",
  });
  assert.equal(payload, null);
});

test("returns null on a non-ok response", async () => {
  await withMockFetch(
    () =>
      Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
      }),
    async () => {
      const payload = await readGlmUsageLimits({
        apiKey: "key",
        baseUrl: "https://api.z.ai",
      });
      assert.equal(payload, null);
    }
  );
});
