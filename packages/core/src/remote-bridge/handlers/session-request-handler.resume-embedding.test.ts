import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { Session } from "../../session-manager";
import type { SessionModelBinding } from "../../session-model-binding";
import {
  createHarness,
  internals,
} from "./session-request-handler.test-helpers";

interface RecordedInternalMessage {
  readonly content: string;
  readonly sessionId: string;
}

interface RecordedProviderSend {
  readonly content: string;
  readonly providerSessionId: string;
  readonly turnOptions: Record<string, unknown> | undefined;
}

const createTempDir = (prefix: string): string =>
  mkdtempSync(path.join(os.tmpdir(), prefix));

test("rolloverFlowNodeSession embeds continuity report body into resume prompt", async () => {
  const workspacePath = "/tmp/continuity-resume-embedding";
  const reportsDir = createTempDir("codeai-hub-resume-report-");
  const reportPath = path.join(reportsDir, "report.md");
  const tmpReportPath = path.join(reportsDir, "report.tmp.md");

  const largeBody = `# Continuity Report\n\n${"x".repeat(10_000)}`;
  mkdirSync(path.dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, largeBody, "utf8");

  const harness = createHarness({
    templatesDir: createTempDir("codeai-hub-templates-"),
    continuityPreemptRemainingPercentThreshold: 0,
  });
  const recorded: RecordedInternalMessage[] = [];
  const sourceSession: Session = harness.sessionManager.createSession(
    "codexCli",
    workspacePath,
    "provider-source",
    {
      initiativeSlug: "CodeAI-Hub-test",
      stage: "implementation",
      runSlug: "reviewer",
    }
  );

  const api = internals(harness.handler);
  harness.providerRegistry.getAdapter = () => ({});
  Object.assign(api.flowNodeContinuity, {
    buildReportPaths: () => ({ reportPath, tmpReportPath }),
  });
  Object.assign(api.sessionBootstrap, {
    createAndRegisterSession: () =>
      Promise.resolve({
        ...sourceSession,
        id: "next-session",
        providerSessionId: "provider-next",
      }),
  });
  Object.assign(api.messageDispatch, {
    sendInternalMessage: (sessionId: string, content: string) => {
      recorded.push({ sessionId, content });
      return Promise.resolve();
    },
  });

  await api.flowNodeRollover.rolloverFlowNodeSession(
    sourceSession,
    { remainingPercent: 1, thresholdPercent: 2, rolloverId: "rollover-1" },
    { silent: true }
  );

  const resume = recorded.find((entry) =>
    entry.content.includes("# Flow Node Continuity — Resume")
  );
  assert.ok(resume, "Expected resume prompt to be sent");

  assert.equal(resume.sessionId, "next-session");
  assert.equal(resume.content.includes(reportPath), true);
  assert.equal(
    resume.content.includes("## Continuity Report (copied by Core)"),
    true
  );
  assert.equal(resume.content.includes("# Continuity Report"), true);
  assert.equal(resume.content.includes("[...truncated...]"), true);
});

test("Documentation Tree synthetic rollover inherits Codex model binding without bootstrap resume turn", async () => {
  const workspacePath = "/tmp/continuity-resume-model-binding";
  const reportsDir = createTempDir("codeai-hub-resume-binding-report-");
  const reportPath = path.join(reportsDir, "report.md");
  const tmpReportPath = path.join(reportsDir, "report.tmp.md");
  mkdirSync(path.dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, "# Continuity Report\n\nReady.\n", "utf8");

  const harness = createHarness({
    templatesDir: createTempDir("codeai-hub-templates-"),
    continuityPreemptRemainingPercentThreshold: 0,
  });
  const sourceSession = harness.sessionManager.createSession(
    "codexCli",
    workspacePath,
    "provider-source",
    {
      initiativeSlug: "CodeAI-Hub-test",
      stage: "virtual_simulation",
      runSlug: null,
    }
  );
  const sourceBinding: SessionModelBinding = {
    key: "provider\u001fcodexCli\u001fsession\u001fsource-session",
    providerId: "codexCli",
    baseModelId: "gpt-5.3-codex-spark",
    modelId: "gpt-5.3-codex-spark reasoning:xhigh",
    reasoningEffort: "xhigh",
    source: "switch_request",
    boundAt: "2026-05-03T08:00:00.000Z",
    updatedAt: "2026-05-03T08:00:00.000Z",
  };
  harness.sessionManager.setModelBinding(sourceSession.id, sourceBinding);
  harness.providerSessions.set(sourceSession.id, {
    providerId: "codexCli",
    providerSessionId: "provider-source",
    unsubscribe: () => {
      // no provider subscription in this focused test
    },
  });

  const api = internals(harness.handler);
  const providerSends: RecordedProviderSend[] = [];
  harness.providerRegistry.getAdapter = () => ({
    createSession: () => Promise.resolve("provider-next"),
    sendMessage: (
      providerSessionId: string,
      content: string,
      turnOptions?: Record<string, unknown>
    ) => {
      providerSends.push({
        providerSessionId,
        content,
        turnOptions,
      });
      return Promise.resolve();
    },
    subscribe: () => () => {
      // no provider subscription in this focused test
    },
  });
  Object.assign(api.flowNodeContinuity, {
    buildReportPaths: () => ({ reportPath, tmpReportPath }),
  });

  await api.flowNodeRollover.rolloverFlowNodeSession(
    harness.sessionManager.getSession(sourceSession.id) ?? sourceSession,
    { remainingPercent: 1, thresholdPercent: 2, rolloverId: "rollover-1" },
    { silent: true }
  );

  const nextSession = harness.sessionManager
    .listSessions()
    .find((session) => session.id !== sourceSession.id);
  assert.ok(nextSession, "Expected rollover target session");
  assert.equal(nextSession.modelBinding?.source, "continuity_inherited");
  assert.equal(
    nextSession.modelBinding?.modelId,
    "gpt-5.3-codex-spark reasoning:xhigh"
  );
  const lifecycleReader = api.resumeLifecycle as unknown as {
    readonly getSessionResumeLifecycleState: (session: Session) => {
      readonly mode: string;
    };
  };
  assert.equal(
    lifecycleReader.getSessionResumeLifecycleState(nextSession).mode,
    "resume_in_place"
  );
  assert.equal(providerSends.length, 0);
});
