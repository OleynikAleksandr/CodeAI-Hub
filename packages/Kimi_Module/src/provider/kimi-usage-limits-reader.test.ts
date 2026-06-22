import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  extractKimiApiKeyFromConfig,
  KimiUsageLimitsReader,
} from "./kimi-usage-limits-reader";

const SAMPLE_CONFIG = `
[providers.other]
api_key = "wrong"

[providers.kimi-for-coding]
api_key = "sk-kimi-test"
`;

test("extractKimiApiKeyFromConfig reads the kimi-for-coding provider key only", () => {
  assert.equal(extractKimiApiKeyFromConfig(SAMPLE_CONFIG), "sk-kimi-test");
  assert.equal(
    extractKimiApiKeyFromConfig("[providers.kimi-for-coding]\napi_key = ''"),
    null
  );
});

test("KimiUsageLimitsReader derives 5h from remaining and weekly from used", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "kimi-usage-reader-"));
  const configPath = path.join(tempDir, "config.toml");
  await writeFile(configPath, SAMPLE_CONFIG, "utf8");
  const fetchCalls: Array<{
    readonly headers: Record<string, string>;
    readonly url: string;
  }> = [];
  const reader = new KimiUsageLimitsReader({
    clock: () => new Date("2026-05-19T12:00:00.000Z"),
    fetch: (url, init) => {
      fetchCalls.push({ headers: init.headers, url });
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          limits: [
            {
              detail: {
                // Real Kimi 5h detail reports `remaining`, not `used`; the
                // reader must derive used = limit - remaining (100 - 91 = 9).
                limit: "100",
                remaining: "91",
                resetTime: "2026-05-19T12:50:12.630219Z",
              },
              window: {
                duration: 300,
                timeUnit: "TIME_UNIT_MINUTE",
              },
            },
          ],
          usage: {
            limit: "100",
            remaining: "87",
            resetTime: "2026-05-23T11:50:12.630219Z",
            used: "13",
          },
        }),
      });
    },
  });

  try {
    const payload = await reader.read({
      force: true,
      userConfigPath: configPath,
    });

    assert.equal(fetchCalls.length, 1);
    assert.equal(fetchCalls[0]?.url, "https://api.kimi.com/coding/v1/usages");
    assert.equal(fetchCalls[0]?.headers.Authorization, "Bearer sk-kimi-test");
    assert.equal(payload?.providerScopeKey, "kimi:global");
    assert.equal(payload?.usageLimits.currentSession?.percentUsed, 9);
    assert.equal(
      payload?.usageLimits.currentSession?.resetsAt,
      "2026-05-19T12:50:12.630Z"
    );
    assert.equal(payload?.usageLimits.currentWeekAllModels?.percentUsed, 13);
    assert.equal(
      payload?.usageLimits.currentWeekAllModels?.resetsAt,
      "2026-05-23T11:50:12.630Z"
    );
    assert.equal(payload?.usageLimits.currentWeekSonnetOnly, null);
    assert.deepEqual(payload?.data.usageLimitLabels, {
      currentSession: "5h",
      currentWeekAllModels: "Weekly",
    });
    assert.equal(payload?.data.diagnostics.force, true);
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
});

test("KimiUsageLimitsReader returns null when the config has no API key", async () => {
  const reader = new KimiUsageLimitsReader({
    fetch: () =>
      Promise.reject(new Error("fetch must not run without an API key")),
  });

  assert.equal(
    await reader.read({ userConfigPath: "/tmp/missing-kimi-config.toml" }),
    null
  );
});
