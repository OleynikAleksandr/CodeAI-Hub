import assert from "node:assert/strict";
import test from "node:test";
import { CodexRolloutDedupe } from "./codex-rollout-dedupe";
import {
  createCodexRolloutSegmentId,
  parseCodexRolloutEvent,
  parseCodexRolloutEvents,
} from "./codex-rollout-event-parser";

test("codex rollout event parser normalizes provider-native reasoning, commentary, final answer, and task completion", () => {
  const events = parseCodexRolloutEvents([
    {
      timestamp: "2026-04-05T12:32:52.687Z",
      type: "event_msg",
      payload: {
        type: "agent_reasoning",
        text: "Inspecting files for updates.",
        turn_id: "turn-1",
      },
    },
    {
      timestamp: "2026-04-05T12:32:52.823Z",
      type: "event_msg",
      payload: {
        type: "agent_message",
        message: "Reading the questionnaire before editing.",
        phase: "commentary",
        turn_id: "turn-1",
      },
    },
    {
      timestamp: "2026-04-05T12:32:52.823Z",
      type: "response_item",
      payload: {
        type: "message",
        phase: "commentary",
      },
    },
    {
      timestamp: "2026-04-05T12:37:30.041Z",
      type: "event_msg",
      payload: {
        type: "agent_message",
        message: "Updated Final_Description.md.",
        phase: "final_answer",
        turn_id: "turn-1",
      },
    },
    {
      timestamp: "2026-04-05T12:37:30.043Z",
      type: "event_msg",
      payload: {
        type: "task_complete",
        last_agent_message: "Updated Final_Description.md.",
        turn_id: "turn-1",
      },
    },
  ]);

  assert.deepEqual(events, [
    {
      content: "Inspecting files for updates.",
      kind: "thinking",
      payloadType: "agent_reasoning",
      phase: null,
      timestamp: "2026-04-05T12:32:52.687Z",
      turnId: "turn-1",
    },
    {
      content: "Reading the questionnaire before editing.",
      kind: "commentary",
      payloadType: "agent_message",
      phase: "commentary",
      timestamp: "2026-04-05T12:32:52.823Z",
      turnId: "turn-1",
    },
    {
      content: "Updated Final_Description.md.",
      kind: "final_answer",
      payloadType: "agent_message",
      phase: "final_answer",
      timestamp: "2026-04-05T12:37:30.041Z",
      turnId: "turn-1",
    },
    {
      content: "Updated Final_Description.md.",
      kind: "task_complete",
      payloadType: "task_complete",
      phase: null,
      timestamp: "2026-04-05T12:37:30.043Z",
      turnId: "turn-1",
    },
  ]);
});

test("codex rollout event parser ignores unsupported phases, empty content, and non-event_msg entries", () => {
  assert.equal(
    parseCodexRolloutEvent({
      type: "event_msg",
      payload: {
        type: "agent_message",
        message: "Should be ignored",
        phase: "unknown",
      },
    }),
    null
  );
  assert.equal(
    parseCodexRolloutEvent({
      type: "event_msg",
      payload: {
        type: "agent_reasoning",
        text: "   ",
      },
    }),
    null
  );
  assert.equal(
    parseCodexRolloutEvent({
      type: "response_item",
      payload: {
        type: "message",
        phase: "final_answer",
      },
    }),
    null
  );
});

test("codex rollout segment ids stay stable and dedupe suppresses repeated segments", () => {
  const [event] = parseCodexRolloutEvents([
    {
      timestamp: "2026-04-05T12:32:52.823Z",
      type: "event_msg",
      payload: {
        type: "agent_message",
        message: "Reading the questionnaire before editing.",
        phase: "commentary",
        turn_id: "turn-1",
      },
    },
  ]);

  assert.ok(event);

  const firstId = createCodexRolloutSegmentId(event);
  const secondId = createCodexRolloutSegmentId({ ...event });
  assert.equal(firstId, secondId);

  const dedupe = new CodexRolloutDedupe();
  assert.equal(dedupe.remember(event), true);
  assert.equal(dedupe.remember(event), false);
  assert.deepEqual(dedupe.filterNew([event]), []);
});
