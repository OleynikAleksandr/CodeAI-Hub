import assert from "node:assert/strict";
import test from "node:test";
import { WorkflowRuntime } from "./workflow-runtime";

const createLogger = () =>
  ({
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
  }) as never;

test("WorkflowRuntime advances lastActive for canonical later-stage artifacts", async () => {
  const runtime = new WorkflowRuntime({
    logger: createLogger(),
    providerRegistry: {
      getAdapter: () => null,
    } as never,
    sessionHandler: {
      createSessionForWorkflow: () => Promise.resolve(null),
      handleMessage: () => Promise.resolve(),
    } as never,
  });

  const lastActiveUpserts: Array<{
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
    readonly stage: string;
    readonly artifactPath?: string;
  }> = [];

  (
    runtime as unknown as {
      descriptionStepStore: {
        upsert: () => Promise<void>;
      };
      lastActiveStore: {
        upsert: (
          workspaceRoot: string,
          workspaceSlug: string,
          value: {
            readonly stage: string;
            readonly artifactPath?: string;
          }
        ) => Promise<void>;
      };
    }
  ).descriptionStepStore = {
    upsert: () => {
      throw new Error("Unexpected descriptionStepStore.upsert call");
    },
  };

  (
    runtime as unknown as {
      lastActiveStore: {
        upsert: (
          runtimeWorkspaceRoot: string,
          runtimeWorkspaceSlug: string,
          value: {
            readonly stage: string;
            readonly artifactPath?: string;
          }
        ) => Promise<void>;
      };
    }
  ).lastActiveStore = {
    upsert: (runtimeWorkspaceRoot, runtimeWorkspaceSlug, value) => {
      lastActiveUpserts.push({
        workspaceRoot: runtimeWorkspaceRoot,
        workspaceSlug: runtimeWorkspaceSlug,
        stage: value.stage,
        artifactPath: value.artifactPath,
      });
      return Promise.resolve();
    },
  };

  const handleWorkflowEvent = (
    runtime as unknown as {
      handleWorkflowEvent: (
        workspaceRoot: string,
        event: unknown
      ) => Promise<boolean>;
    }
  ).handleWorkflowEvent.bind(runtime);

  const workspaceRoot = "/tmp/workspace";
  const workspaceSlug = "workspace-later-stages";
  const stages = [
    {
      stage: "virtual_simulation",
      filePath: "virtual_simulation/virtual-simulation.md",
    },
    {
      stage: "diagram_modules",
      filePath: "diagram_modules/modules-diagram.mmd",
    },
    {
      stage: "diagram_facades",
      filePath: "diagram_facades/facades-graph.mmd",
    },
  ] as const;

  for (const [index, entry] of stages.entries()) {
    const shouldRecord = await handleWorkflowEvent(workspaceRoot, {
      type: "workflow.artifact.written",
      timestamp: `2026-03-12T19:1${index}:00.000Z`,
      workspaceSlug,
      stage: entry.stage,
      filePath: entry.filePath,
    });
    assert.equal(shouldRecord, true);
  }

  assert.deepEqual(lastActiveUpserts, [
    {
      workspaceRoot,
      workspaceSlug,
      stage: "virtual_simulation",
      artifactPath:
        ".codeai-hub/workspace-later-stages/virtual_simulation/virtual-simulation.md",
    },
    {
      workspaceRoot,
      workspaceSlug,
      stage: "diagram_modules",
      artifactPath:
        ".codeai-hub/workspace-later-stages/diagram_modules/modules-diagram.mmd",
    },
    {
      workspaceRoot,
      workspaceSlug,
      stage: "diagram_facades",
      artifactPath:
        ".codeai-hub/workspace-later-stages/diagram_facades/facades-graph.mmd",
    },
  ]);
});

test("WorkflowRuntime ignores non-canonical later-stage artifact paths", async () => {
  const runtime = new WorkflowRuntime({
    logger: createLogger(),
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
      lastActiveStore: {
        upsert: () => Promise<void>;
      };
    }
  ).lastActiveStore = {
    upsert: () => {
      throw new Error("Unexpected lastActiveStore.upsert call");
    },
  };

  const handleWorkflowEvent = (
    runtime as unknown as {
      handleWorkflowEvent: (
        workspaceRoot: string,
        event: unknown
      ) => Promise<boolean>;
    }
  ).handleWorkflowEvent.bind(runtime);

  const shouldRecord = await handleWorkflowEvent("/tmp/workspace", {
    type: "workflow.artifact.written",
    timestamp: "2026-03-12T19:20:00.000Z",
    workspaceSlug: "workspace-later-stages",
    stage: "virtual_simulation",
    filePath: "virtual_simulation/runs/attempt-1/virtual-simulation.md",
  });

  assert.equal(shouldRecord, true);
});
