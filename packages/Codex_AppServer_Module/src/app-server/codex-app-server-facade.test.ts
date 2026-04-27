import assert from "node:assert/strict";
import test from "node:test";
import { CODEX_APPLIED_TURN_CONFIG_KEY } from "../types";
import { CodexAppServerFacade } from "./codex-app-server-facade";

const EARLY_ARCHITECTURE_WORKFLOW_PATTERN = /early architecture workflow/;

test("CodexAppServerFacade applies CodeAI Hub instruction profile on thread start", async () => {
  const requests: {
    readonly method: string;
    readonly params: unknown;
  }[] = [];
  const facade = Object.create(
    CodexAppServerFacade.prototype
  ) as CodexAppServerFacade;
  (
    facade as unknown as {
      eventRouter: {
        emitCachedUsageLimits(threadId: string): void;
        emitRuntimeModel(threadId: string, model: unknown): void;
      };
      handshakedThreadIds: Set<string>;
      process: {
        request<TResult = unknown>(
          method: string,
          params?: unknown
        ): Promise<TResult>;
      };
      sessions: Map<string, unknown>;
      workspace: {
        defaultApprovalMode: string;
        defaultModel: string;
        defaultSandboxMode: string;
        workspacePath: string;
      };
    }
  ).process = {
    request: (method, params) => {
      requests.push({ method, params });
      return Promise.resolve({
        model: "gpt-5.5",
        thread: { id: "thread-runtime-test" },
      } as never);
    },
  };
  (
    facade as unknown as {
      eventRouter: {
        emitCachedUsageLimits(threadId: string): void;
        emitRuntimeModel(threadId: string, model: unknown): void;
      };
      handshakedThreadIds: Set<string>;
      sessions: Map<string, unknown>;
      workspace: {
        defaultApprovalMode: string;
        defaultModel: string;
        defaultSandboxMode: string;
        workspacePath: string;
      };
    }
  ).eventRouter = {
    emitCachedUsageLimits: () => undefined,
    emitRuntimeModel: () => undefined,
  };
  (
    facade as unknown as {
      handshakedThreadIds: Set<string>;
      sessions: Map<string, unknown>;
      workspace: {
        defaultApprovalMode: string;
        defaultModel: string;
        defaultSandboxMode: string;
        workspacePath: string;
      };
    }
  ).sessions = new Map();
  (
    facade as unknown as {
      handshakedThreadIds: Set<string>;
      workspace: {
        defaultApprovalMode: string;
        defaultModel: string;
        defaultSandboxMode: string;
        workspacePath: string;
      };
    }
  ).handshakedThreadIds = new Set();
  (
    facade as unknown as {
      workspace: {
        defaultApprovalMode: string;
        defaultModel: string;
        defaultSandboxMode: string;
        workspacePath: string;
      };
    }
  ).workspace = {
    defaultApprovalMode: "on-request",
    defaultModel: "gpt-5.5",
    defaultSandboxMode: "workspace-write",
    workspacePath: "/workspace/default",
  };

  const threadId = await facade.createSession("/workspace/runtime");

  assert.equal(threadId, "thread-runtime-test");
  assert.equal(requests[0]?.method, "thread/start");
  const params = requests[0]?.params as {
    readonly baseInstructions?: string;
    readonly config?: unknown;
  };
  assert.match(
    params.baseInstructions ?? "",
    EARLY_ARCHITECTURE_WORKFLOW_PATTERN
  );
  assert.deepEqual(params.config, { project_doc_max_bytes: 0 });
});

test("CodexAppServerFacade omits reasoning summary for Codex Spark turns", async () => {
  const requests: {
    readonly method: string;
    readonly params: unknown;
  }[] = [];
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
        turn: { id: "spark-turn" },
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
  ).handshakedThreadIds = new Set(["thread-spark"]);
  (
    facade as unknown as {
      workspace: {
        defaultReasoningEffort: string;
        workspacePath: string;
      };
    }
  ).workspace = {
    defaultReasoningEffort: "medium",
    workspacePath: "/workspace/spark",
  };

  await facade.sendMessage("thread-spark", "hello spark", {
    [CODEX_APPLIED_TURN_CONFIG_KEY]: {
      modelId: "gpt-5.3-codex-spark",
      providerId: "codexCli",
      reasoningEffort: "medium",
      source: "settings_snapshot",
    },
  });

  assert.equal(requests[0]?.method, "turn/start");
  const params = requests[0]?.params as Record<string, unknown>;
  assert.equal(params.model, "gpt-5.3-codex-spark");
  assert.equal(params.effort, "medium");
  assert.equal("summary" in params, false);
});
