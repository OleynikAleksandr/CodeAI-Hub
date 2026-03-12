import assert from "node:assert/strict";
import test from "node:test";
import { WorkflowRuntime } from "./runtime/workflow-runtime";
import { WorkflowWatcher } from "./watcher/workflow-watcher";

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

test("WorkflowWatcher ignores description step metadata artifacts", () => {
  const watcher = new WorkflowWatcher({
    logger: createLogger(),
    workspaceSlug: "workspace-metadata",
    watchRoot: "/tmp/workspace-metadata",
    enableFsWatch: false,
    clock: () => "2026-03-12T18:30:00.000Z",
  });
  const events: unknown[] = [];
  watcher.subscribe((event) => {
    events.push(event);
  });

  const handleFsEvent = (
    watcher as unknown as {
      handleFsEvent: (eventType: string, fileName: string) => void;
    }
  ).handleFsEvent.bind(watcher);

  handleFsEvent("change", "description/description-step.json");
  handleFsEvent("change", "description/description-step.json.tmp-123-456");
  handleFsEvent("change", "description/questionnaire.md");

  assert.equal(events.length, 1);
  assert.deepEqual(events[0], {
    type: "workflow.artifact.written",
    timestamp: "2026-03-12T18:30:00.000Z",
    workspaceSlug: "workspace-metadata",
    stage: "description",
    filePath: "description/questionnaire.md",
  });
});

test("WorkflowRuntime ignores description step metadata artifacts", async () => {
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
      descriptionStepStore: {
        upsert: () => Promise<void>;
      };
      lastActiveStore: {
        upsert: () => Promise<void>;
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

  const exactMetadataResult = await handleWorkflowEvent("/tmp/workspace", {
    type: "workflow.artifact.written",
    timestamp: "2026-03-12T18:31:00.000Z",
    workspaceSlug: "workspace-metadata",
    stage: "description",
    filePath: "description/description-step.json",
  });
  const tempMetadataResult = await handleWorkflowEvent("/tmp/workspace", {
    type: "workflow.artifact.written",
    timestamp: "2026-03-12T18:31:01.000Z",
    workspaceSlug: "workspace-metadata",
    stage: "description",
    filePath: "description/description-step.json.tmp-123-456",
  });

  assert.equal(exactMetadataResult, false);
  assert.equal(tempMetadataResult, false);
});
