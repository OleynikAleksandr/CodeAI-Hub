import assert from "node:assert/strict";
import test from "node:test";
import { WorkflowRuntime } from "./workflow-runtime";

type CreatedWorkflowSession = {
  readonly providerId: string;
  readonly workspacePath: string;
  readonly context: {
    readonly initiativeSlug: string;
    readonly stage: string;
    readonly runSlug?: string | null;
    readonly resumeMode?: string;
  };
};

type RuntimeHarness = {
  readonly runtime: WorkflowRuntime;
  readonly createdSessions: CreatedWorkflowSession[];
  readonly handledMessages: Array<{
    readonly sessionId: string;
    readonly prompt: string;
  }>;
  readonly warnings: string[];
};

const createHarness = (options: {
  readonly adapters: Record<
    string,
    { readonly resumeSession?: unknown } | undefined
  >;
  readonly preferredProviderId: string;
  readonly draftPath?: string;
}): RuntimeHarness => {
  const createdSessions: CreatedWorkflowSession[] = [];
  const handledMessages: Array<{
    readonly sessionId: string;
    readonly prompt: string;
  }> = [];
  const warnings: string[] = [];

  const runtime = new WorkflowRuntime({
    logger: {
      info: () => {
        // noop
      },
      warn: (message: string) => {
        warnings.push(message);
      },
      error: () => {
        // noop
      },
      debug: () => {
        // noop
      },
    } as never,
    providerRegistry: {
      getAdapter: (providerId: string) => options.adapters[providerId],
    } as never,
    sessionHandler: {
      createSessionForWorkflow: (request: CreatedWorkflowSession) => {
        createdSessions.push(request);
        return Promise.resolve({ id: "workflow-session-1" });
      },
      handleMessage: (sessionId: string, prompt: string) => {
        handledMessages.push({ sessionId, prompt });
        return Promise.resolve();
      },
    } as never,
  });

  (
    runtime as unknown as {
      descriptionStepStore: {
        read: (
          workspaceRoot: string,
          workspaceSlug: string
        ) => Promise<{
          draftPath?: string;
          finalPath?: string;
          sessionKind?: "collector" | "reviewer";
          session?: { providerId: string };
          workspacePath: string;
          workspaceSlug: string;
          createdAt: string;
          updatedAt: string;
        } | null>;
      };
    }
  ).descriptionStepStore = {
    read: (workspaceRoot: string, workspaceSlug: string) =>
      Promise.resolve({
        workspacePath: workspaceRoot,
        workspaceSlug,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        draftPath:
          options.draftPath ??
          `.codeai-hub/${workspaceSlug}/description/description.md`,
        sessionKind: "collector",
        session: {
          providerId: options.preferredProviderId,
        },
      }),
  };

  return {
    runtime,
    createdSessions,
    handledMessages,
    warnings,
  };
};

test("WorkflowRuntime keeps reviewer on preferred gemini provider when resume is supported", async () => {
  const harness = createHarness({
    preferredProviderId: "geminiCli",
    adapters: {
      geminiCli: {
        resumeSession: () => Promise.resolve("gemini-resumed-id"),
      },
      claudeCodeCli: {
        resumeSession: () => Promise.resolve("claude-resumed-id"),
      },
    },
  });

  await (
    harness.runtime as unknown as {
      maybeAutoStartReviewer: (params: {
        readonly workspaceRoot: string;
        readonly workspaceSlug: string;
      }) => Promise<void>;
    }
  ).maybeAutoStartReviewer({
    workspaceRoot: "/tmp/workspace-gemini",
    workspaceSlug: "workspace-gemini",
  });

  assert.equal(harness.createdSessions.length, 1);
  assert.equal(harness.createdSessions[0]?.providerId, "geminiCli");
  assert.equal(harness.createdSessions[0]?.context.stage, "description");
  assert.equal(harness.createdSessions[0]?.context.runSlug, "reviewer");
  assert.equal(harness.handledMessages.length, 1);
  assert.equal(harness.handledMessages[0]?.sessionId, "workflow-session-1");
  assert.equal(harness.warnings.length, 0);
});

test("WorkflowRuntime reviewer prompt uses run-scoped draft path when provided", async () => {
  const workspaceSlug = "workspace-runs";
  const draftPath = `.codeai-hub/${workspaceSlug}/description/runs/attempt-123/description.md`;

  const harness = createHarness({
    preferredProviderId: "claudeCodeCli",
    draftPath,
    adapters: {
      claudeCodeCli: {
        resumeSession: () => Promise.resolve("claude-resumed-id"),
      },
    },
  });

  await (
    harness.runtime as unknown as {
      maybeAutoStartReviewer: (params: {
        readonly workspaceRoot: string;
        readonly workspaceSlug: string;
      }) => Promise<void>;
    }
  ).maybeAutoStartReviewer({
    workspaceRoot: "/tmp/workspace-runs",
    workspaceSlug,
  });

  assert.equal(harness.handledMessages.length, 1);
  assert.equal(harness.handledMessages[0]?.prompt.includes(draftPath), true);
});

test("WorkflowRuntime falls back to claude reviewer when preferred gemini lacks resume support", async () => {
  const harness = createHarness({
    preferredProviderId: "geminiCli",
    adapters: {
      geminiCli: {
        // no resumeSession in current adapter contract
      },
      claudeCodeCli: {
        resumeSession: () => Promise.resolve("claude-resumed-id"),
      },
    },
  });

  await (
    harness.runtime as unknown as {
      maybeAutoStartReviewer: (params: {
        readonly workspaceRoot: string;
        readonly workspaceSlug: string;
      }) => Promise<void>;
    }
  ).maybeAutoStartReviewer({
    workspaceRoot: "/tmp/workspace-fallback",
    workspaceSlug: "workspace-fallback",
  });

  assert.equal(harness.createdSessions.length, 1);
  assert.equal(harness.createdSessions[0]?.providerId, "claudeCodeCli");
  assert.equal(
    harness.warnings.includes(
      "Reviewer auto-start switched provider due resume support"
    ),
    true
  );
});

test("WorkflowRuntime ignores stale description draft runs when collector attempt changes", async () => {
  const runtime = new WorkflowRuntime({
    logger: {
      info: () => {
        // noop
      },
      warn: () => {
        // noop
      },
      error: () => {
        // noop
      },
      debug: () => {
        // noop
      },
    } as never,
    providerRegistry: {
      getAdapter: () => null,
    } as never,
    sessionHandler: {
      createSessionForWorkflow: () => Promise.resolve(null),
      handleMessage: () => Promise.resolve(),
    } as never,
  });

  (
    runtime as unknown as {
      descriptionStepStore: {
        read: () => Promise<{
          workspaceSlug: string;
          workspacePath: string;
          createdAt: string;
          updatedAt: string;
          sessionKind: "collector";
          collectorSession: {
            dialogSessionId: string;
            providerSessionId: string;
          };
        }>;
      };
      lastActiveStore: {
        upsert: () => Promise<void>;
      };
    }
  ).descriptionStepStore = {
    read: () =>
      Promise.resolve({
        workspaceSlug: "workspace-stale-run",
        workspacePath: "/tmp/workspace-stale-run",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sessionKind: "collector",
        collectorSession: {
          dialogSessionId: "attempt-new",
          providerSessionId: "provider-new",
        },
      }),
  };

  (
    runtime as unknown as {
      lastActiveStore: { upsert: () => Promise<void> };
    }
  ).lastActiveStore = {
    upsert: () => {
      throw new Error("Unexpected lastActiveStore.upsert call");
    },
  };

  const shouldRecord = await (
    runtime as unknown as {
      handleWorkflowEvent: (
        workspaceRoot: string,
        event: unknown
      ) => Promise<boolean>;
    }
  ).handleWorkflowEvent("/tmp/workspace-stale-run", {
    type: "workflow.artifact.written",
    timestamp: new Date().toISOString(),
    workspaceSlug: "workspace-stale-run",
    stage: "description",
    filePath: "description/runs/attempt-old/description.md",
  });

  assert.equal(shouldRecord, false);
});
