import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { Session } from "../../session-manager";
import { createHarness } from "./session-request-handler.test";

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
      stage: "description",
      runSlug: "reviewer",
    }
  );

  harness.providerRegistry.getAdapter = () => ({});
  Object.assign((harness.api as any).flowNodeContinuity, {
    buildReportPaths: () => ({ reportPath, tmpReportPath }),
  });
  Object.assign((harness.api as any).sessionBootstrap, {
    createAndRegisterSession: () =>
      Promise.resolve({
        ...sourceSession,
        id: "next-session",
        providerSessionId: "provider-next",
      }),
  });
  Object.assign((harness.api as any).messageDispatch, {
    sendInternalMessage: (sessionId: string, content: string) => {
      recorded.push({ sessionId, content });
      return Promise.resolve();
    },
  });

  await (harness.api as any).rolloverFlowNodeSession(
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
