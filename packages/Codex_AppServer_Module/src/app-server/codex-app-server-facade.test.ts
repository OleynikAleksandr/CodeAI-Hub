import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  CODEX_APPLIED_TURN_CONFIG_KEY,
  CODEX_MODEL_SWITCH_INJECTION_KEY,
} from "../types";
import { CodexAppServerFacade } from "./codex-app-server-facade";
import { resolveCodexWorkflowInvocationProfile } from "./codex-workflow-instruction-profile";
import { CODEX_WORKFLOW_DOCUMENTATION_PROCESS_PROFILE_KEY } from "./process/codex-app-server-process-profile";

const EARLY_ARCHITECTURE_WORKFLOW_PATTERN = /early architecture workflow/;
const MODEL_SWITCH_TAG_PATTERN = /<model_switch>/;
const MODEL_SWITCH_PROFILE_PATTERN =
  /Use the new Codex Spark instruction profile/;

const writeCodexSettings = async (
  settingsPath: string,
  reasoningSummaryEnabled: boolean
): Promise<void> => {
  await writeFile(
    settingsPath,
    JSON.stringify({
      providers: {
        codex: {
          reasoningSummaryEnabled,
        },
      },
    }),
    "utf8"
  );
};

const createSendMessageFacadeHarness = (
  threadId: string
): {
  readonly facade: CodexAppServerFacade;
  readonly requests: {
    readonly method: string;
    readonly params: unknown;
  }[];
} => {
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

const sendNonSparkTurn = (
  facade: CodexAppServerFacade,
  threadId: string,
  content: string
): Promise<void> =>
  facade.sendMessage(threadId, content, {
    [CODEX_APPLIED_TURN_CONFIG_KEY]: {
      modelId: "gpt-5.5",
      providerId: "codexCli",
      reasoningEffort: "high",
      source: "settings_snapshot",
    },
  });

test("Codex workflow invocation profile selects startup and thread controls", () => {
  const profile = resolveCodexWorkflowInvocationProfile();

  assert.equal(
    profile.processProfileKey,
    CODEX_WORKFLOW_DOCUMENTATION_PROCESS_PROFILE_KEY
  );
  assert.match(profile.baseInstructions, EARLY_ARCHITECTURE_WORKFLOW_PATTERN);
  assert.deepEqual(profile.threadConfig, { project_doc_max_bytes: 0 });
});

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
        defaultSandboxMode?: string;
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
        defaultSandboxMode?: string;
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
        defaultSandboxMode?: string;
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
        defaultSandboxMode?: string;
        workspacePath: string;
      };
    }
  ).handshakedThreadIds = new Set();
  (
    facade as unknown as {
      workspace: {
        defaultApprovalMode: string;
        defaultModel: string;
        defaultSandboxMode?: string;
        workspacePath: string;
      };
    }
  ).workspace = {
    defaultApprovalMode: "on-request",
    defaultModel: "gpt-5.5",
    workspacePath: "/workspace/default",
  };

  const threadId = await facade.createSession("/workspace/runtime");

  assert.equal(threadId, "thread-runtime-test");
  assert.equal(requests[0]?.method, "thread/start");
  const params = requests[0]?.params as {
    readonly approvalPolicy?: string;
    readonly baseInstructions?: string;
    readonly config?: unknown;
    readonly sandbox?: string;
  };
  assert.equal(params.approvalPolicy, "on-request");
  assert.equal(params.sandbox, "danger-full-access");
  assert.match(
    params.baseInstructions ?? "",
    EARLY_ARCHITECTURE_WORKFLOW_PATTERN
  );
  assert.deepEqual(params.config, { project_doc_max_bytes: 0 });
});

test("CodexAppServerFacade sends summary none for Codex Spark turns", async () => {
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
  assert.equal(params.summary, "none");
});

test("CodexAppServerFacade keeps explicit reasoning summary for non-Spark turns", async () => {
  const previousCodeSettingsPath = process.env.CODEX_SETTINGS_PATH;
  const tempDir = await mkdtemp(path.join(tmpdir(), "codex-facade-settings-"));
  const settingsPath = path.join(tempDir, "settings.json");
  await writeFile(
    settingsPath,
    JSON.stringify({
      providers: {
        codex: {
          reasoningSummaryEnabled: true,
        },
      },
    }),
    "utf8"
  );
  process.env.CODEX_SETTINGS_PATH = settingsPath;

  try {
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
          turn: { id: "non-spark-turn" },
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
    ).handshakedThreadIds = new Set(["thread-non-spark"]);
    (
      facade as unknown as {
        workspace: {
          defaultReasoningEffort: string;
          workspacePath: string;
        };
      }
    ).workspace = {
      defaultReasoningEffort: "high",
      workspacePath: "/workspace/non-spark",
    };

    await facade.sendMessage("thread-non-spark", "hello", {
      [CODEX_APPLIED_TURN_CONFIG_KEY]: {
        modelId: "gpt-5.5",
        providerId: "codexCli",
        reasoningEffort: "high",
        source: "settings_snapshot",
      },
    });

    assert.equal(requests[0]?.method, "turn/start");
    const params = requests[0]?.params as Record<string, unknown>;
    assert.equal(params.model, "gpt-5.5");
    assert.equal(params.effort, "high");
    assert.equal(params.summary, "detailed");
  } finally {
    if (previousCodeSettingsPath === undefined) {
      process.env.CODEX_SETTINGS_PATH = undefined;
    } else {
      process.env.CODEX_SETTINGS_PATH = previousCodeSettingsPath;
    }
  }
});

test("CodexAppServerFacade prepends model switch instructions to turn input", async () => {
  const threadId = "thread-model-switch";
  const { facade, requests } = createSendMessageFacadeHarness(threadId);

  await facade.sendMessage(threadId, "continue after switch", {
    [CODEX_MODEL_SWITCH_INJECTION_KEY]: {
      kind: "model_switch",
      baseInstructions: "Use the new Codex Spark instruction profile.",
    },
  });

  const params = requests[0]?.params as {
    readonly input?: ReadonlyArray<{
      readonly text?: string;
      readonly type?: string;
    }>;
  };
  assert.equal(params.input?.[0]?.type, "text");
  assert.match(params.input?.[0]?.text ?? "", MODEL_SWITCH_TAG_PATTERN);
  assert.match(params.input?.[0]?.text ?? "", MODEL_SWITCH_PROFILE_PATTERN);
  assert.equal(params.input?.[1]?.text, "continue after switch");
});

test("CodexAppServerFacade caches non-Spark reasoning summary settings by path for rapid turns", async () => {
  const previousCodeSettingsPath = process.env.CODEX_SETTINGS_PATH;
  const tempDir = await mkdtemp(path.join(tmpdir(), "codex-facade-cache-"));
  const firstSettingsPath = path.join(tempDir, "settings-a.json");
  const secondSettingsPath = path.join(tempDir, "settings-b.json");
  await writeCodexSettings(firstSettingsPath, false);
  await writeCodexSettings(secondSettingsPath, true);
  process.env.CODEX_SETTINGS_PATH = firstSettingsPath;

  try {
    const threadId = "thread-cache";
    const { facade, requests } = createSendMessageFacadeHarness(threadId);

    await sendNonSparkTurn(facade, threadId, "first");
    await writeCodexSettings(firstSettingsPath, true);
    await sendNonSparkTurn(facade, threadId, "second");

    process.env.CODEX_SETTINGS_PATH = secondSettingsPath;
    await sendNonSparkTurn(facade, threadId, "third");

    assert.equal(
      (requests[0]?.params as Record<string, unknown>).summary,
      "none"
    );
    assert.equal(
      (requests[1]?.params as Record<string, unknown>).summary,
      "none"
    );
    assert.equal(
      (requests[2]?.params as Record<string, unknown>).summary,
      "detailed"
    );
  } finally {
    if (previousCodeSettingsPath === undefined) {
      process.env.CODEX_SETTINGS_PATH = undefined;
    } else {
      process.env.CODEX_SETTINGS_PATH = previousCodeSettingsPath;
    }
    await rm(tempDir, { force: true, recursive: true });
  }
});
