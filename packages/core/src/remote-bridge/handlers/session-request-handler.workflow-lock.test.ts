import assert from "node:assert/strict";
import test from "node:test";
import type { DescriptionStepSnapshot } from "../../workflow/description/description-step-types";
import type {
  WorkspaceExecutionProfileSeed,
  WorkspaceExecutionProfileSnapshot,
} from "../../workflow/execution-profile/workspace-execution-profile-types";
import { SessionRequestHandler } from "./session-request-handler";

type ReadOrBootstrapCall = {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
  readonly seed: WorkspaceExecutionProfileSeed | null;
};

type InfoRecord = {
  readonly message: string;
  readonly metadata?: Record<string, unknown>;
};

type LockHarness = {
  readonly handler: SessionRequestHandler;
  readonly bootstrapCalls: ReadOrBootstrapCall[];
  readonly infoRecords: InfoRecord[];
};

type LockedWorkflowProviderContextRequest = {
  readonly providerId: string;
  readonly workspacePath: string;
  readonly initiativeSlug: string | null;
  readonly stage: string | null;
  readonly requestedProviderSessionId: string | null;
};

type LockedWorkflowProviderContextResult = {
  readonly providerId: string;
  readonly providerSessionId: string | null;
};

const LOCKED_AT = "2026-03-12T10:00:00.000Z";

const createHarness = (options?: {
  readonly executionProfile?: WorkspaceExecutionProfileSnapshot;
  readonly descriptionSnapshot?: DescriptionStepSnapshot | null;
  readonly defaultModels?: Record<string, string | null | undefined>;
}): LockHarness => {
  const bootstrapCalls: ReadOrBootstrapCall[] = [];
  const infoRecords: InfoRecord[] = [];
  const handler = Object.create(
    SessionRequestHandler.prototype
  ) as SessionRequestHandler & Record<string, unknown>;

  Object.assign(handler, {
    executionProfileFacade: {
      readOrBootstrap: async (params: {
        readonly workspaceRoot: string;
        readonly workspaceSlug: string;
        readonly resolveLegacySeed: () => Promise<WorkspaceExecutionProfileSeed | null>;
      }) => {
        if (options?.executionProfile) {
          return options.executionProfile;
        }
        const seed = await params.resolveLegacySeed();
        bootstrapCalls.push({
          workspaceRoot: params.workspaceRoot,
          workspaceSlug: params.workspaceSlug,
          seed,
        });
        if (!seed) {
          return null;
        }
        return {
          version: 1,
          workspaceSlug: params.workspaceSlug,
          workspacePath: params.workspaceRoot,
          lockedAt: LOCKED_AT,
          lockedFromStage: seed.lockedFromStage ?? "description",
          providerId: seed.providerId,
          modelId: seed.modelId,
        } satisfies WorkspaceExecutionProfileSnapshot;
      },
    },
    descriptionStepStore: {
      read: async () => options?.descriptionSnapshot ?? null,
    },
    providerRegistry: {
      getDefaultModel: (providerId: string) =>
        options?.defaultModels?.[providerId] ?? null,
    },
    logger: {
      info: (message: string, metadata?: Record<string, unknown>) => {
        infoRecords.push({ message, metadata });
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
    },
  });

  return {
    handler,
    bootstrapCalls,
    infoRecords,
  };
};

const resolveLockedWorkflowProviderContext = (
  handler: SessionRequestHandler,
  options: LockedWorkflowProviderContextRequest
): Promise<LockedWorkflowProviderContextResult> =>
  (
    handler as unknown as {
      resolveLockedWorkflowProviderContext: (
        options: LockedWorkflowProviderContextRequest
      ) => Promise<LockedWorkflowProviderContextResult>;
    }
  ).resolveLockedWorkflowProviderContext(options);

test("SessionRequestHandler overrides workflow provider with locked workspace profile", async () => {
  const harness = createHarness({
    executionProfile: {
      version: 1,
      workspaceSlug: "workspace-lock",
      workspacePath: "/tmp/workspace-lock",
      lockedAt: LOCKED_AT,
      lockedFromStage: "description",
      providerId: "codexCli",
      modelId: "gpt-5.4",
    },
  });

  const result = await resolveLockedWorkflowProviderContext(harness.handler, {
    providerId: "geminiCli",
    workspacePath: "/tmp/workspace-lock",
    initiativeSlug: "workspace-lock",
    stage: "description",
    requestedProviderSessionId: "gemini-provider-session",
  });

  assert.deepEqual(result, {
    providerId: "codexCli",
    providerSessionId: null,
  });
  assert.equal(harness.bootstrapCalls.length, 0);
  assert.equal(harness.infoRecords.length, 1);
  assert.equal(
    harness.infoRecords[0]?.message,
    "Workflow provider selection overridden by locked workspace profile"
  );
  assert.equal(harness.infoRecords[0]?.metadata?.lockedProviderId, "codexCli");
});

test("SessionRequestHandler bootstraps workspace profile from legacy collector session", async () => {
  const harness = createHarness({
    descriptionSnapshot: {
      workspaceSlug: "workspace-legacy",
      workspacePath: "/tmp/workspace-legacy",
      createdAt: LOCKED_AT,
      updatedAt: LOCKED_AT,
      sessionKind: "collector",
      collectorSession: {
        providerId: "claudeCodeCli",
        providerSessionId: "claude-provider-session",
        jsonlPath: "/tmp/workspace-legacy/dialog.jsonl",
      },
    },
    defaultModels: {
      claudeCodeCli: "claude-sonnet-4-20250514",
    },
  });

  const result = await resolveLockedWorkflowProviderContext(harness.handler, {
    providerId: "geminiCli",
    workspacePath: "/tmp/workspace-legacy",
    initiativeSlug: "workspace-legacy",
    stage: "description",
    requestedProviderSessionId: "gemini-provider-session",
  });

  assert.deepEqual(result, {
    providerId: "claudeCodeCli",
    providerSessionId: null,
  });
  assert.deepEqual(harness.bootstrapCalls, [
    {
      workspaceRoot: "/tmp/workspace-legacy",
      workspaceSlug: "workspace-legacy",
      seed: {
        providerId: "claudeCodeCli",
        modelId: "claude-sonnet-4-20250514",
        lockedFromStage: "description",
      },
    },
  ]);
});
