import assert from "node:assert/strict";
import test from "node:test";
import {
  CODEX_APPLIED_TURN_CONFIG_KEY,
  CODEX_MODEL_SWITCH_INJECTION_KEY,
} from "../types";
import { CodexAppServerFacade } from "./codex-app-server-facade";

const MODEL_SWITCH_TAG_PATTERN = /<model_switch>/;
const MODEL_SWITCH_PROFILE_PATTERN =
  /Use the new Codex Spark instruction profile/;

interface RequestRecord {
  readonly method: string;
  readonly params: unknown;
}

const createSendMessageFacadeHarness = (
  threadId: string
): {
  readonly facade: CodexAppServerFacade;
  readonly requests: RequestRecord[];
} => {
  const requests: RequestRecord[] = [];
  const facade = Object.create(
    CodexAppServerFacade.prototype
  ) as CodexAppServerFacade;
  (
    facade as unknown as {
      handshakedThreadIds: Set<string>;
      process: {
        request<TResult = unknown>(
          method: string,
          params?: unknown
        ): Promise<TResult>;
      };
      sessions: Map<string, unknown>;
      workspace: {
        defaultReasoningEffort: string;
        workspacePath: string;
      };
    }
  ).process = {
    request: (method, params) => {
      requests.push({ method, params });
      return Promise.resolve({
        turn: { id: `${threadId}-turn-${requests.length}` },
      } as never);
    },
  };
  (
    facade as unknown as {
      handshakedThreadIds: Set<string>;
      sessions: Map<string, unknown>;
      workspace: {
        defaultReasoningEffort: string;
        workspacePath: string;
      };
    }
  ).sessions = new Map();
  (
    facade as unknown as {
      handshakedThreadIds: Set<string>;
      workspace: {
        defaultReasoningEffort: string;
        workspacePath: string;
      };
    }
  ).handshakedThreadIds = new Set([threadId]);
  (
    facade as unknown as {
      workspace: {
        defaultReasoningEffort: string;
        workspacePath: string;
      };
    }
  ).workspace = {
    defaultReasoningEffort: "high",
    workspacePath: "/workspace/cache",
  };

  return { facade, requests };
};

test("CodexAppServerFacade sends Spark model switch turns with summary none", async () => {
  const threadId = "thread-spark-model-switch";
  const { facade, requests } = createSendMessageFacadeHarness(threadId);

  await facade.sendMessage(threadId, "continue after switch", {
    [CODEX_APPLIED_TURN_CONFIG_KEY]: {
      modelId: "gpt-5.3-codex-spark",
      providerId: "codexCli",
      reasoningEffort: "low",
      source: "session_binding",
    },
    [CODEX_MODEL_SWITCH_INJECTION_KEY]: {
      kind: "model_switch",
      targetModelId: "gpt-5.3-codex-spark",
      targetReasoningEffort: "low",
      baseInstructions: "Use the new Codex Spark instruction profile.",
    },
  });

  assert.equal(requests[0]?.method, "turn/start");
  const params = requests[0]?.params as {
    readonly effort?: string;
    readonly input?: ReadonlyArray<{
      readonly text?: string;
      readonly type?: string;
    }>;
    readonly model?: string;
    readonly summary?: string;
  };
  assert.equal(params.model, "gpt-5.3-codex-spark");
  assert.equal(params.effort, "low");
  assert.equal(params.summary, "none");
  assert.equal(params.input?.[0]?.type, "text");
  assert.match(params.input?.[0]?.text ?? "", MODEL_SWITCH_TAG_PATTERN);
  assert.match(params.input?.[0]?.text ?? "", MODEL_SWITCH_PROFILE_PATTERN);
  assert.equal(params.input?.[1]?.text, "continue after switch");
});
