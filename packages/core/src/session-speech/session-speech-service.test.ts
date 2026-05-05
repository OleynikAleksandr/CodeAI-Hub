import assert from "node:assert/strict";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  normalizeSpeechRate,
  parseAppleSpeechHelperResponse,
  resolveAppleSpeechHelperPath,
  SessionSpeechService,
} from "./session-speech-service";

const HELPER_UNAVAILABLE_PATTERN = /helper is unavailable/u;

const createExecutableHelper = async (scriptBody: string): Promise<string> => {
  const root = await mkdtemp(path.join(tmpdir(), "session-speech-helper-"));
  const helperPath = path.join(root, "apple-speech-helper");
  await writeFile(helperPath, `#!/bin/sh\n${scriptBody}\n`, "utf8");
  await chmod(helperPath, 0o755);
  return helperPath;
};

const waitForState = async (
  service: SessionSpeechService,
  status: string
): Promise<void> => {
  const deadline = Date.now() + 1000;
  while (Date.now() < deadline) {
    if (service.getState().status === status) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};

test("resolveAppleSpeechHelperPath returns executable candidate", async () => {
  const helperPath = await createExecutableHelper(
    "cat >/dev/null\nprintf '%s\\n' '{\"ok\":true}'"
  );
  try {
    assert.equal(
      resolveAppleSpeechHelperPath([
        path.join(path.dirname(helperPath), "missing"),
        helperPath,
      ]),
      helperPath
    );
  } finally {
    await rm(path.dirname(helperPath), { recursive: true, force: true });
  }
});

test("normalizeSpeechRate clamps provider-independent multiplier", () => {
  assert.equal(normalizeSpeechRate(undefined), 1);
  assert.equal(normalizeSpeechRate(0.2), 0.75);
  assert.equal(normalizeSpeechRate(1.25), 1.25);
  assert.equal(normalizeSpeechRate(5), 2);
});

test("parseAppleSpeechHelperResponse reads the last JSON line", () => {
  assert.deepEqual(parseAppleSpeechHelperResponse('noise\n{"ok":true}\n'), {
    ok: true,
  });
});

test("SessionSpeechService starts helper and records finished state", async () => {
  const helperPath = await createExecutableHelper(
    "cat >/dev/null\nprintf '%s\\n' '{\"ok\":true,\"normalizedRate\":1.5}'"
  );
  const states: string[] = [];
  try {
    const service = new SessionSpeechService({
      helperPathCandidates: [helperPath],
      now: () => "2026-05-05T18:00:00.000Z",
      onStateChange: (state) => states.push(state.status),
    });
    const startState = service.speak({
      messageId: "message-1",
      rate: 1.5,
      sessionId: "session-1",
      text: "Привет",
    });

    assert.equal(startState.status, "speaking");
    await waitForState(service, "finished");

    const finalState = service.getState();
    assert.equal(finalState.status, "finished");
    assert.equal(finalState.normalizedRate, 1.5);
    assert.deepEqual(states, ["speaking", "finished"]);
  } finally {
    await rm(path.dirname(helperPath), { recursive: true, force: true });
  }
});

test("SessionSpeechService reports missing helper as user-actionable error", () => {
  const service = new SessionSpeechService({
    helperPathCandidates: [path.join(tmpdir(), "missing-speech-helper")],
    now: () => "2026-05-05T18:00:00.000Z",
  });
  const state = service.speak({
    messageId: "message-1",
    sessionId: "session-1",
    text: "Hello",
  });

  assert.equal(state.status, "error");
  assert.match(state.error ?? "", HELPER_UNAVAILABLE_PATTERN);
});

test("SessionSpeechService stops an active helper process", async () => {
  const helperPath = await createExecutableHelper(
    "cat >/dev/null\nsleep 5\nprintf '%s\\n' '{\"ok\":true}'"
  );
  try {
    const service = new SessionSpeechService({
      helperPathCandidates: [helperPath],
      speakTimeoutMs: 10_000,
    });
    const startState = service.speak({
      messageId: "message-1",
      sessionId: "session-1",
      text: "Hello",
    });

    assert.equal(startState.status, "speaking");
    const stopState = service.stop({ sessionId: "session-1" });
    assert.equal(stopState.status, "stopping");

    await waitForState(service, "idle");
    assert.equal(service.getState().status, "idle");
  } finally {
    await rm(path.dirname(helperPath), { recursive: true, force: true });
  }
});
