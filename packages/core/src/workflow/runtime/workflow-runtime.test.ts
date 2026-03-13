import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { WorkflowRuntime } from "./workflow-runtime";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "packages/core/src/workflow/runtime/workflow-runtime.ts"
);

type DescriptionSnapshot = {
  readonly workspaceSlug: string;
  readonly workspacePath: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly finalPath?: string;
};

type RuntimeHarness = {
  readonly runtime: WorkflowRuntime;
  readonly descriptionUpserts: Record<string, unknown>[];
  readonly lastActiveUpserts: Record<string, unknown>[];
};

const createHarness = (
  snapshot: DescriptionSnapshot | null = null
): RuntimeHarness => {
  const descriptionUpserts: Record<string, unknown>[] = [];
  const lastActiveUpserts: Record<string, unknown>[] = [];

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
        read: () => Promise<DescriptionSnapshot | null>;
        upsert: (
          workspaceRoot: string,
          workspaceSlug: string,
          update: Record<string, unknown>
        ) => Promise<void>;
      };
      lastActiveStore: {
        upsert: (
          workspaceRoot: string,
          workspaceSlug: string,
          update: Record<string, unknown>
        ) => Promise<void>;
      };
    }
  ).descriptionStepStore = {
    read: () => Promise.resolve(snapshot),
    upsert: (_workspaceRoot, _workspaceSlug, update) => {
      descriptionUpserts.push(update);
      return Promise.resolve();
    },
  };

  (
    runtime as unknown as {
      lastActiveStore: {
        upsert: (
          workspaceRoot: string,
          workspaceSlug: string,
          update: Record<string, unknown>
        ) => Promise<void>;
      };
    }
  ).lastActiveStore = {
    upsert: (_workspaceRoot, _workspaceSlug, update) => {
      lastActiveUpserts.push(update);
      return Promise.resolve();
    },
  };

  return { runtime, descriptionUpserts, lastActiveUpserts };
};

const emitDescriptionWrite = async (
  harness: RuntimeHarness,
  filePath: string,
  workspaceSlug = "demo-workspace"
): Promise<boolean> =>
  await (
    harness.runtime as unknown as {
      handleWorkflowEvent: (
        workspaceRoot: string,
        event: unknown
      ) => Promise<boolean>;
    }
  ).handleWorkflowEvent("/tmp/demo-workspace", {
    type: "workflow.artifact.written",
    timestamp: "2026-03-13T12:00:00.000Z",
    workspaceSlug,
    stage: "description",
    filePath,
  });

test("WorkflowRuntime source keeps description cleanup invariants", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(source.includes("maybeAutoStartReviewer"), false);
  assert.equal(source.includes("collectorAttempt"), false);
  assert.equal(source.includes("reviewer"), false);
  assert.equal(
    source.includes('relativePath.startsWith("description/runs/")'),
    true
  );
});

test("WorkflowRuntime records questionnaire writes into description state", async () => {
  const harness = createHarness();

  const shouldRecord = await emitDescriptionWrite(
    harness,
    "description/questionnaire.md"
  );

  assert.equal(shouldRecord, true);
  assert.deepEqual(harness.descriptionUpserts, [
    {
      questionnairePath:
        ".codeai-hub/demo-workspace/description/questionnaire.md",
    },
  ]);
  assert.deepEqual(harness.lastActiveUpserts, [
    {
      stage: "description",
      artifactPath: ".codeai-hub/demo-workspace/description/questionnaire.md",
    },
  ]);
});

test("WorkflowRuntime records Final_Description.md as canonical description artifact", async () => {
  const harness = createHarness();

  const shouldRecord = await emitDescriptionWrite(
    harness,
    "description/Final_Description.md"
  );

  assert.equal(shouldRecord, true);
  assert.deepEqual(harness.descriptionUpserts, [
    {
      finalPath: ".codeai-hub/demo-workspace/description/Final_Description.md",
    },
  ]);
  assert.deepEqual(harness.lastActiveUpserts, [
    {
      stage: "description",
      artifactPath:
        ".codeai-hub/demo-workspace/description/Final_Description.md",
    },
  ]);
});

test("WorkflowRuntime keeps legacy description.md only as fallback when final artifact is absent", async () => {
  const harness = createHarness();

  const shouldRecord = await emitDescriptionWrite(
    harness,
    "description/description.md"
  );

  assert.equal(shouldRecord, true);
  assert.deepEqual(harness.descriptionUpserts, [
    {
      draftPath: ".codeai-hub/demo-workspace/description/description.md",
    },
  ]);
  assert.deepEqual(harness.lastActiveUpserts, [
    {
      stage: "description",
      artifactPath: ".codeai-hub/demo-workspace/description/description.md",
    },
  ]);
});

test("WorkflowRuntime ignores legacy description.md writes after Final_Description.md exists", async () => {
  const harness = createHarness({
    workspaceSlug: "demo-workspace",
    workspacePath: "/tmp/demo-workspace",
    createdAt: "2026-03-13T12:00:00.000Z",
    updatedAt: "2026-03-13T12:00:00.000Z",
    finalPath: ".codeai-hub/demo-workspace/description/Final_Description.md",
  });

  const shouldRecord = await emitDescriptionWrite(
    harness,
    "description/description.md"
  );

  assert.equal(shouldRecord, false);
  assert.deepEqual(harness.descriptionUpserts, []);
  assert.deepEqual(harness.lastActiveUpserts, []);
});

test("WorkflowRuntime ignores legacy run-scoped description drafts", async () => {
  const harness = createHarness();

  const shouldRecord = await emitDescriptionWrite(
    harness,
    "description/runs/attempt-old/description.md"
  );

  assert.equal(shouldRecord, false);
  assert.deepEqual(harness.descriptionUpserts, []);
  assert.deepEqual(harness.lastActiveUpserts, []);
});
