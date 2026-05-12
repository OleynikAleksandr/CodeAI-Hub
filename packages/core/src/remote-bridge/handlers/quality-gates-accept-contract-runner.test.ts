import assert from "node:assert/strict";
import test from "node:test";
import type { ManagedGitStatus } from "./managed-git-stage-gate";
import { runQualityGatesAcceptContractCommand } from "./quality-gates-accept-contract-runner";
import type { QualityGatesAcceptanceWriteResult } from "./quality-gates-acceptance-writer";
import type { QualityGatesProgressSnapshot } from "./quality-gates-progress";

const SESSION_ID = "session-qg-runner";
const WORKSPACE_PATH = "/tmp/demo-workspace";
const WORKSPACE_SLUG = "demo-workspace";
const AUDIT_TEXT_RE = /Quality Gates acceptance via typed-fallback/u;
const SESSION_STAGE_REASON_RE = /Quality Gates session/u;
const INJECT_FAILURE_REASON_RE =
  /Core could not inject the Quality Gates acceptance microtask/u;

const buildAcceptableProgress = (
  overrides: Partial<QualityGatesProgressSnapshot> = {}
): QualityGatesProgressSnapshot => ({
  accepted: false,
  acceptanceCommitted: false,
  commandContractReady: true,
  integrated: false,
  integrationState: "draft",
  jsonExists: true,
  markdownExists: true,
  substep: "awaiting_acceptance",
  validationErrors: [],
  ...overrides,
});

const buildCleanGitStatus = (): ManagedGitStatus => ({
  clean: true,
  dirtyByStage: {
    application_skeleton: [],
    diagram_modules: [],
    quality_gates: [],
  },
  dirtyFiles: [],
});

interface RunnerSpy {
  readonly auditCalls: Array<{ sessionId: string; text: string }>;
  readonly handleCalls: string[];
  readonly injectCalls: Array<{ workspaceRoot: string }>;
  readonly logCalls: Array<{
    message: string;
    payload?: Record<string, unknown>;
  }>;
  readonly markAcceptedCalls: string[];
  readonly resetRetryCalls: string[];
  readonly writeCalls: Array<{ workspaceRoot: string; workspaceSlug: string }>;
}

const buildRunnerDeps = (
  progress: QualityGatesProgressSnapshot | null,
  writeResult: QualityGatesAcceptanceWriteResult = { status: "patched" }
): {
  readonly deps: Parameters<typeof runQualityGatesAcceptContractCommand>[0];
  readonly spy: RunnerSpy;
} => {
  const spy: RunnerSpy = {
    auditCalls: [],
    handleCalls: [],
    injectCalls: [],
    logCalls: [],
    markAcceptedCalls: [],
    resetRetryCalls: [],
    writeCalls: [],
  };
  return {
    deps: {
      sessionId: SESSION_ID,
      source: "typed-fallback",
      appendAudit: (sessionId, record) => {
        spy.auditCalls.push({
          sessionId,
          text: typeof record.text === "string" ? record.text : "",
        });
        return Promise.resolve();
      },
      handle: (sessionId) => {
        spy.handleCalls.push(sessionId);
      },
      injectAcceptanceTaskPair: (params) => {
        spy.injectCalls.push(params);
        return Promise.resolve(true);
      },
      logger: {
        info: (message, payload) => {
          spy.logCalls.push({ message, payload });
        },
      },
      markAccepted: (sessionId) => {
        spy.markAcceptedCalls.push(sessionId);
      },
      readQualityGatesProgress: () => Promise.resolve(progress),
      readManagedGit: () => Promise.resolve(buildCleanGitStatus()),
      resetRetryCounter: (sessionId) => {
        spy.resetRetryCalls.push(sessionId);
      },
      resolveSession: () => ({
        initiativeSlug: WORKSPACE_SLUG,
        stage: "quality_gates",
        workspacePath: WORKSPACE_PATH,
      }),
      writeAcceptanceFlag: (params) => {
        spy.writeCalls.push(params);
        return Promise.resolve(writeResult);
      },
    },
    spy,
  };
};

test("runner injects acceptance task pair and patches quality-gates.json on accepted decision", async () => {
  const { deps, spy } = buildRunnerDeps(buildAcceptableProgress());
  const decision = await runQualityGatesAcceptContractCommand(deps);

  assert.equal(decision.kind, "accepted");
  assert.deepEqual(spy.injectCalls, [{ workspaceRoot: WORKSPACE_PATH }]);
  assert.deepEqual(spy.writeCalls, [
    { workspaceRoot: WORKSPACE_PATH, workspaceSlug: WORKSPACE_SLUG },
  ]);
  assert.deepEqual(spy.markAcceptedCalls, [SESSION_ID]);
  assert.deepEqual(spy.resetRetryCalls, [SESSION_ID]);
  assert.deepEqual(spy.handleCalls, [SESSION_ID]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(spy.auditCalls.length, 1);
  assert.match(spy.auditCalls[0]?.text ?? "", AUDIT_TEXT_RE);
});

test("runner rejects when session stage is not quality_gates", async () => {
  const { deps, spy } = buildRunnerDeps(buildAcceptableProgress());
  const decision = await runQualityGatesAcceptContractCommand({
    ...deps,
    resolveSession: () => ({
      initiativeSlug: WORKSPACE_SLUG,
      stage: "application_skeleton",
      workspacePath: WORKSPACE_PATH,
    }),
  });

  assert.equal(decision.kind, "rejected");
  if (decision.kind === "rejected") {
    assert.match(decision.reasons[0] ?? "", SESSION_STAGE_REASON_RE);
  }
  assert.deepEqual(spy.writeCalls, []);
  assert.deepEqual(spy.injectCalls, []);
});

test("runner rejects when acceptance is already committed", async () => {
  const { deps, spy } = buildRunnerDeps(
    buildAcceptableProgress({
      accepted: true,
      acceptanceCommitted: true,
      substep: "accepted",
    })
  );
  const decision = await runQualityGatesAcceptContractCommand(deps);

  assert.equal(decision.kind, "rejected");
  if (decision.kind === "rejected") {
    assert.equal(
      decision.reasons.some((reason) =>
        reason.includes("acceptance is already committed")
      ),
      true
    );
  }
  assert.deepEqual(spy.injectCalls, []);
});

test("runner rejects when contract is missing commands object", async () => {
  const { deps } = buildRunnerDeps(
    buildAcceptableProgress({ commandContractReady: false })
  );
  const decision = await runQualityGatesAcceptContractCommand(deps);

  assert.equal(decision.kind, "rejected");
  if (decision.kind === "rejected") {
    assert.equal(
      decision.reasons.some((reason) =>
        reason.includes("no parseable commands object")
      ),
      true
    );
  }
});

test("runner rejects when out-of-owner managed stages are dirty", async () => {
  const { deps } = buildRunnerDeps(buildAcceptableProgress());
  const decision = await runQualityGatesAcceptContractCommand({
    ...deps,
    readManagedGit: () =>
      Promise.resolve({
        clean: false,
        dirtyByStage: {
          application_skeleton: [
            ".codeai-hub/demo/application_skeleton/application-skeleton.md",
          ],
          diagram_modules: [],
          quality_gates: [],
        },
        dirtyFiles: [
          ".codeai-hub/demo/application_skeleton/application-skeleton.md",
        ],
      }),
  });

  assert.equal(decision.kind, "rejected");
  if (decision.kind === "rejected") {
    assert.equal(
      decision.reasons.some((reason) =>
        reason.includes("Other managed stages")
      ),
      true
    );
  }
});

test("runner rejects when inject task pair fails", async () => {
  const { deps } = buildRunnerDeps(buildAcceptableProgress());
  const decision = await runQualityGatesAcceptContractCommand({
    ...deps,
    injectAcceptanceTaskPair: () => Promise.resolve(false),
  });

  assert.equal(decision.kind, "rejected");
  if (decision.kind === "rejected") {
    assert.match(decision.reasons[0] ?? "", INJECT_FAILURE_REASON_RE);
  }
});
