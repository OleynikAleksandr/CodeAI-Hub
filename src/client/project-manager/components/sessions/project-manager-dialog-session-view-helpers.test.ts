import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDialogSessionRecord,
  resolveDialogMatch,
  sanitizeDialogIndexEntry,
  type DialogOpenIntent,
} from "./project-manager-dialog-session-view-helpers";

const intent: DialogOpenIntent = {
  providerId: "codexCli",
  providerSessionId: "provider-session-1",
  workspacePath: "/workspace",
  workspaceSlug: "workspace",
  initiativeSlug: "workspace",
  stage: "description",
  sessionKind: "collector",
  runSlug: "collector",
};

test("dialog bootstrap preserves model binding from dialog index", () => {
  const entry = sanitizeDialogIndexEntry({
    stage: "description",
    rootSessionId: "dialog-1",
    dialogId: "dialog-1",
    updatedAt: "2026-04-28T12:00:00.000Z",
    latestSessionId: "session-1",
    providerId: "codexCli",
    providerSessionId: "provider-session-1",
    modelBinding: {
      providerId: "codexCli",
      modelId: "gpt-5.3-codex-spark reasoning:xhigh",
      reasoningEffort: "xhigh",
      source: "settings_default",
    },
  });

  assert.ok(entry);
  const session = buildDialogSessionRecord({
    dialogId: entry.dialogId,
    runtimeSessionId: entry.latestSessionId,
    providerId: "codexCli",
    providerSessionId: entry.providerSessionId,
    modelBinding: entry.modelBinding,
    intent,
  });

  assert.equal(
    session.modelBinding?.modelId,
    "gpt-5.3-codex-spark reasoning:xhigh"
  );
});

test("dialog match prefers selected development-tree node identity", () => {
  const olderNodeDialog = sanitizeDialogIndexEntry({
    stage: "development_tree/materialized/product-parts/project-manager/modules/workflow-orchestration-ui",
    rootSessionId: "node-root",
    dialogId: "codex-node-workflow-orchestration-ui",
    updatedAt: "2026-05-05T08:00:00.000Z",
    latestSessionId: "node-session",
    providerId: "codexCli",
    providerSessionId: "provider-session-node",
    modelBinding: null,
  });
  const newerDiagramDialog = sanitizeDialogIndexEntry({
    stage: "diagram_modules",
    rootSessionId: "diagram-root",
    dialogId: "codex-diagram-modules",
    updatedAt: "2026-05-05T08:10:00.000Z",
    latestSessionId: "diagram-session",
    providerId: "codexCli",
    providerSessionId: "provider-session-diagram",
    modelBinding: null,
  });
  assert.ok(olderNodeDialog);
  assert.ok(newerDiagramDialog);

  const match = resolveDialogMatch({
    intent: {
      ...intent,
      providerSessionId: null,
      stage: "diagram_modules",
      targetDialogId: "codex-node-workflow-orchestration-ui",
      targetRootSessionId: "node-root",
      targetSessionId: "node-session",
    },
    dialogs: [newerDiagramDialog, olderNodeDialog],
  });

  assert.equal(match?.dialogId, "codex-node-workflow-orchestration-ui");
});
