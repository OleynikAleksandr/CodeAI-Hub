import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDialogSessionRecord,
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
