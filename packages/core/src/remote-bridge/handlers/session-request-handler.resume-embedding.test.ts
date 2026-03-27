import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { FlowNodeContinuityFacade } from "../../flow-node-continuity/flow-node-continuity-facade";
import { type Session, SessionManager } from "../../session-manager";
import { SessionRequestHandler } from "./session-request-handler";

interface RecordedInternalMessage {
  readonly content: string;
  readonly sessionId: string;
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

  const templatesDir = createTempDir("codeai-hub-templates-");
  const continuity = new FlowNodeContinuityFacade({
    templatesDir,
    preemptRemainingPercentThreshold: 0,
  });
  (continuity as any).buildReportPaths = () => ({ reportPath, tmpReportPath });

  const recorded: RecordedInternalMessage[] = [];

  const handler = Object.create(
    SessionRequestHandler.prototype
  ) as SessionRequestHandler & Record<string, unknown>;

  const sessionManager = new SessionManager();
  const sourceSession: Session = sessionManager.createSession(
    "codexCli",
    workspacePath,
    "provider-source",
    {
      initiativeSlug: "CodeAI-Hub-test",
      stage: "description",
      runSlug: "reviewer",
    }
  );

  Object.assign(handler, {
    flowNodeContinuity: continuity,
    sessionManager,
    flowNodeContinuityCreateReportRequests: new Map(),
    flowNodeContinuityCreateReportAckWaiters: new Map(),
    flowNodeContinuityLockContexts: new Map(),
    flowNodeContinuityLockTimeouts: new Map(),
    flowNodeRolloverInFlight: new Set(),
    flowNodeRolloverStarted: new Set(),
    postTurnContextDecisionPendingSessions: new Set(),
    postTurnContextDecisionBySessionId: new Map(),
    providerRegistry: {
      getAdapter: () => ({}),
    },
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
    },
    broadcaster: () => {
      // noop
    },
    workspaceRuntime: null,
    stateBroadcaster: () => {
      // noop
    },
    registerFlowNodeContinuityLockContext: (context: unknown) => context,
    emitContinuityLockEvent: () => {
      // noop
    },
    scheduleFlowNodeContinuityLockTimeout: () => {
      // noop
    },
    emitFlowNodeRolloverNotification: () => {
      // noop
    },
    emitTurnStateEvent: () => {
      // noop
    },
    resolveFlowNodeContinuityTemplate: () => ({
      templateId: "flow/continuity/create-report-doc.md",
      canonicalArtifactPath: "",
      isReviewerBootstrapEligible: true,
    }),
    dispatchFlowNodeContinuityCreateReportWithAck: async () => 1,
    waitForFlowNodeContinuityReportWithRetry: async () => 1,
    createAndRegisterSession: () =>
      Promise.resolve({
        ...sourceSession,
        id: "next-session",
        providerSessionId: "provider-next",
      }),
    sendInternalMessage: (sessionId: string, content: string) => {
      recorded.push({ sessionId, content });
      return Promise.resolve();
    },
  });

  await (handler as any).rolloverFlowNodeSession(
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
