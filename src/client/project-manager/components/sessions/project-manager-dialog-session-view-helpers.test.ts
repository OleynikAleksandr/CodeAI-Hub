import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { SessionMessage } from "../../../../types/session";
import DialogPanel from "../../../ui/src/session/dialog-panel";
import {
  buildDialogSpeechWorkbenchMessage,
  buildDialogSessionRecord,
  convertHistoryToMessages,
  resolveDialogMatch,
  resolveActiveSpeechMessageId,
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

const createAssistantMessage = (
  id: string,
  content: string,
  localizedContent?: string
): SessionMessage => ({
  id,
  role: "assistant",
  content,
  createdAt: Date.parse("2026-05-05T18:00:00.000Z"),
  ...(localizedContent ? { localizedContent } : {}),
});

const createSystemMessage = (
  id: string,
  content: string,
  tag?: string
): SessionMessage => ({
  id,
  role: "system",
  content,
  createdAt: Date.parse("2026-05-05T18:00:00.000Z"),
  ...(tag ? { tag } : {}),
});

(globalThis as typeof globalThis & { React?: unknown }).React = React;

const SYSTEM_MESSAGE_CARD_RULE_REGEX =
  /\.session-dialog__message--system\s*\{(?<body>[^}]*)\}/u;

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

test("dialog index preserves projected worktree path", () => {
  const entry = sanitizeDialogIndexEntry({
    stage: "development_tree/materialized/product-parts/finder-widget/clusters/note-selection-cluster",
    rootSessionId: "dialog-root",
    dialogId: "codex-dialog-root",
    updatedAt: "2026-06-09T07:10:00.000Z",
    latestSessionId: "runtime-session",
    providerId: "codexCli",
    providerSessionId: "provider-session",
    modelBinding: null,
    worktreePath: "/workspace.worktrees/finder-widget/note-selection-cluster",
  });

  assert.equal(
    entry?.worktreePath,
    "/workspace.worktrees/finder-widget/note-selection-cluster"
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

test("active speech id follows only in-flight speech states", () => {
  assert.equal(
    resolveActiveSpeechMessageId({
      messageId: "message-1",
      sessionId: "session-1",
      status: "starting",
    }),
    "message-1"
  );
  assert.equal(
    resolveActiveSpeechMessageId({
      messageId: "message-1",
      sessionId: "session-1",
      status: "finished",
    }),
    null
  );
});

test("dialog speech command builder toggles speak and stop", () => {
  const request = {
    messageId: "message-1",
    providerId: "codexCli",
    sessionId: "session-1",
    text: "Visible answer",
  };

  assert.deepEqual(
    buildDialogSpeechWorkbenchMessage({
      activeSpeechMessageId: null,
      rate: 1.35,
      request,
    }),
    {
      type: "session:speech:speak-message",
      payload: {
        ...request,
        rate: 1.35,
      },
    }
  );
  assert.deepEqual(
    buildDialogSpeechWorkbenchMessage({
      activeSpeechMessageId: "message-1",
      rate: 1.35,
      request,
    }),
    {
      type: "session:speech:stop",
      payload: {
        messageId: "message-1",
        sessionId: "session-1",
      },
    }
  );
});

test("DialogPanel renders active Speak button for assistant bubble", () => {
  const html = renderToStaticMarkup(
    createElement(DialogPanel, {
      messages: [createAssistantMessage("assistant-1", "Hello")],
      providerLabel: "Codex",
      speakingMessageId: "assistant-1",
    })
  );

  assert.equal(html.includes("session-dialog__speak-button--active"), true);
  assert.equal(html.includes('aria-pressed="true"'), true);
  assert.equal(html.includes('aria-label="Speak: Codex"'), true);
});

test("DialogPanel keeps Speak button available for assistant thinking bubbles", () => {
  const html = renderToStaticMarkup(
    createElement(DialogPanel, {
      messages: [
        {
          ...createAssistantMessage("thinking-1", "Internal notes"),
          tag: "thinking",
        },
      ],
      providerLabel: "Codex",
      speakingMessageId: null,
    })
  );

  assert.equal(html.includes("session-dialog__speak-button"), true);
  assert.equal(
    html.includes('aria-label="Speak: Codex · Thinking"'),
    true
  );
});

test("dialog history keeps pending thinking source hidden until translation arrives", () => {
  const messages = convertHistoryToMessages([
    {
      messageId: "thinking-history-1",
      role: "assistant",
      tag: "thinking",
      content: "Let me inspect the workflow.",
      timestamp: "2026-05-05T18:00:00.000Z",
      translationState: "pending",
    },
  ]);

  assert.equal(messages[0]?.translationState, "pending");

  const html = renderToStaticMarkup(
    createElement(DialogPanel, {
      messages,
      providerLabel: "Codex",
      speakingMessageId: null,
    })
  );

  assert.equal(html.includes("Let me inspect the workflow."), false);
  assert.equal(
    html.includes("session-dialog__message--assistant-thinking"),
    true
  );
});

test("DialogPanel renders managed review confirm action only for review handoff", () => {
  const activeReview = createSystemMessage(
    "review-1",
    "Core: Diagram Modules перешёл в пользовательскую проверку.",
    "managed-workflow-user-review"
  );
  const reviewHtml = renderToStaticMarkup(
    createElement(DialogPanel, {
      activeManagedReviewMessageId: activeReview.id,
      messages: [activeReview],
      onManagedReviewAccept: () => undefined,
      speakingMessageId: null,
    })
  );
  const staleHtml = renderToStaticMarkup(
    createElement(DialogPanel, {
      activeManagedReviewMessageId: null,
      messages: [activeReview],
      onManagedReviewAccept: () => undefined,
      speakingMessageId: null,
    })
  );
  const ordinaryHtml = renderToStaticMarkup(
    createElement(DialogPanel, {
      messages: [createSystemMessage("system-1", "Core: validation complete.")],
      onManagedReviewAccept: () => undefined,
      speakingMessageId: null,
    })
  );

  assert.equal(
    reviewHtml.includes("session-dialog__managed-review-confirm"),
    true
  );
  assert.equal(reviewHtml.includes("Подтверждаю"), true);
  assert.equal(
    staleHtml.includes("session-dialog__managed-review-confirm"),
    false
  );
  assert.equal(
    ordinaryHtml.includes("session-dialog__managed-review-confirm"),
    false
  );
});

test("DialogPanel explains queued managed review without promising a confirm button", () => {
  const queuedReview = createSystemMessage(
    "review-queued",
    "Core: Quality Gates перешёл в пользовательскую проверку.\nЕсли хотите принять текущий результат, нажмите кнопку «Подтверждаю» ниже.",
    "managed-workflow-user-review-queued"
  );
  const html = renderToStaticMarkup(
    createElement(DialogPanel, {
      activeManagedReviewMessageId: null,
      messages: [queuedReview],
      onManagedReviewAccept: () => undefined,
      speakingMessageId: null,
    })
  );

  assert.equal(
    html.includes("session-dialog__managed-review-confirm"),
    false
  );
  assert.equal(html.includes("ожидает очереди"), true);
  assert.equal(html.includes("нажмите кнопку"), false);
});

test("system dialog messages use the shared card chrome", () => {
  const css = readFileSync(
    new URL("../../../../../media/session-view.css", import.meta.url),
    "utf8"
  );
  const systemRuleBody =
    SYSTEM_MESSAGE_CARD_RULE_REGEX.exec(css)?.groups?.body ?? "";

  assert.match(systemRuleBody, /\bmargin:\s*0 80px;/u);
  assert.match(systemRuleBody, /\bbackground-color:\s*#303234;/u);
  assert.match(systemRuleBody, /\bborder-color:\s*#46474a;/u);
  assert.match(systemRuleBody, /\bbox-shadow:\s*0px 6px 14\.1px 3px #000;/u);
});
