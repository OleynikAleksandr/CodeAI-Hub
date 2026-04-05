import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { CodexRolloutReader } from "./codex-rollout-reader";

const buildRolloutPath = async (root: string, providerSessionId: string) => {
  const dayDir = path.join(root, "sessions", "2026", "04", "05");
  await mkdir(dayDir, { recursive: true });
  return path.join(
    dayDir,
    `rollout-2026-04-05T14-32-39-${providerSessionId}.jsonl`
  );
};

test("codex rollout reader returns appended entries after the provided line cursor", async () => {
  const codexHome = await mkdtemp(path.join(os.tmpdir(), "codex-rollout-"));
  const providerSessionId = "019d5da1-8406-73e1-9a64-e77662dfed73";
  const rolloutPath = await buildRolloutPath(codexHome, providerSessionId);
  const reader = new CodexRolloutReader({ codexHome });

  await writeFile(
    rolloutPath,
    [
      JSON.stringify({
        type: "event_msg",
        payload: { type: "agent_message", message: "commentary-1" },
      }),
      JSON.stringify({
        type: "event_msg",
        payload: { type: "agent_message", message: "commentary-2" },
      }),
    ].join("\n"),
    "utf8"
  );

  const first = await reader.readAppendedEntries({ providerSessionId });

  assert.ok(first);
  assert.equal(first.filePath, rolloutPath);
  assert.equal(first.nextLine, 2);
  assert.deepEqual(first.entries, [
    {
      type: "event_msg",
      payload: { type: "agent_message", message: "commentary-1" },
    },
    {
      type: "event_msg",
      payload: { type: "agent_message", message: "commentary-2" },
    },
  ]);

  await writeFile(
    rolloutPath,
    [
      JSON.stringify({
        type: "event_msg",
        payload: { type: "agent_message", message: "commentary-1" },
      }),
      JSON.stringify({
        type: "event_msg",
        payload: { type: "agent_message", message: "commentary-2" },
      }),
      "not-json-yet",
      JSON.stringify({
        type: "event_msg",
        payload: { type: "agent_message", message: "final-answer" },
      }),
    ].join("\n"),
    "utf8"
  );

  const second = await reader.readAppendedEntries({
    providerSessionId,
    sinceLine: first.nextLine,
  });

  assert.ok(second);
  assert.equal(second.filePath, rolloutPath);
  assert.equal(second.nextLine, 3);
  assert.deepEqual(second.entries, [
    {
      type: "event_msg",
      payload: { type: "agent_message", message: "final-answer" },
    },
  ]);
});
