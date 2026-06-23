import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  KimiNativeTokenUsageReader,
  readKimiNativeTokenUsageFromWireJsonl,
} from "./kimi-native-token-usage-reader";

test("readKimiNativeTokenUsageFromWireJsonl returns the latest native usage record", () => {
  const snapshot = readKimiNativeTokenUsageFromWireJsonl(
    [
      "not-json",
      JSON.stringify({
        event: {
          type: "step.end",
          usage: { inputCacheRead: 200, inputOther: 100, output: 3 },
        },
        type: "context.append_loop_event",
      }),
      JSON.stringify({
        type: "usage.record",
        usage: {
          inputCacheCreation: 5,
          inputCacheRead: 20,
          inputOther: 10,
          output: 2,
        },
      }),
    ].join("\n"),
    99
  );

  assert.deepEqual(snapshot, { limit: 99, used: 37 });
});

test("KimiNativeTokenUsageReader reads a Kimi session wire log and builds a stream event", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "kimi-native-usage-"));
  const wireDir = path.join(
    tempDir,
    "wd_codeai-hub_test",
    "session_abc-123",
    "agents",
    "main"
  );
  await mkdir(wireDir, { recursive: true });
  await writeFile(
    path.join(wireDir, "wire.jsonl"),
    JSON.stringify({
      type: "usage.record",
      usage: {
        inputCacheCreation: 7,
        inputCacheRead: 30,
        inputOther: 40,
        output: 8,
      },
    }),
    "utf8"
  );
  const reader = new KimiNativeTokenUsageReader({
    clock: () => new Date("2026-06-23T10:00:00.000Z"),
    contextTokenLimit: 262_144,
    sessionsRoot: tempDir,
  });

  try {
    assert.deepEqual(await reader.read("session_abc-123"), {
      limit: 262_144,
      used: 85,
    });
    assert.deepEqual(await reader.readEvent("kimi:session_abc-123"), {
      data: {
        kind: "token_usage",
        limit: 262_144,
        provider: "kimi",
        providerSessionId: "session_abc-123",
        source: "kimi_native_wire",
        timestamp: "2026-06-23T10:00:00.000Z",
        tokenUsage: { limit: 262_144, used: 85 },
        used: 85,
      },
      payload: {
        kind: "token_usage",
        limit: 262_144,
        provider: "kimi",
        providerSessionId: "session_abc-123",
        source: "kimi_native_wire",
        timestamp: "2026-06-23T10:00:00.000Z",
        tokenUsage: { limit: 262_144, used: 85 },
        used: 85,
      },
      providerSessionId: "session_abc-123",
      type: "stream_event",
    });
    assert.equal(await reader.read("../session_abc-123"), null);
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
});
