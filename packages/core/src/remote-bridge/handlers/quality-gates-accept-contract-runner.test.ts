import assert from "node:assert/strict";
import test from "node:test";
import { runQualityGatesAcceptContractCommand } from "./quality-gates-accept-contract-runner";

const SESSION_ID = "session-qg-runner";
const DISABLED_REASON_RE =
  /Quality Gates accept-contract side effects are disabled/u;

interface RunnerSpy {
  readonly auditCalls: string[];
  readonly handleCalls: string[];
  readonly injectCalls: string[];
  readonly logCalls: Array<{
    readonly message: string;
    readonly payload?: Record<string, unknown>;
  }>;
  readonly markAcceptedCalls: string[];
  readonly readGitCalls: string[];
  readonly readProgressCalls: string[];
  readonly resetRetryCalls: string[];
  readonly resolveSessionCalls: string[];
  readonly writeCalls: string[];
}

const buildRunnerDeps = (): {
  readonly deps: Parameters<typeof runQualityGatesAcceptContractCommand>[0];
  readonly spy: RunnerSpy;
} => {
  const spy: RunnerSpy = {
    auditCalls: [],
    handleCalls: [],
    injectCalls: [],
    logCalls: [],
    markAcceptedCalls: [],
    readGitCalls: [],
    readProgressCalls: [],
    resetRetryCalls: [],
    resolveSessionCalls: [],
    writeCalls: [],
  };
  return {
    deps: {
      appendAudit: (sessionId) => {
        spy.auditCalls.push(sessionId);
        return Promise.resolve();
      },
      handle: (sessionId) => {
        spy.handleCalls.push(sessionId);
      },
      injectAcceptanceTaskPair: (params) => {
        spy.injectCalls.push(params.workspaceRoot);
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
      readManagedGit: (workspaceRoot) => {
        spy.readGitCalls.push(workspaceRoot);
        return Promise.resolve({
          clean: true,
          dirtyByStage: {
            application_skeleton: [],
            diagram_modules: [],
            quality_gates: [],
          },
          dirtyFiles: [],
        });
      },
      readQualityGatesProgress: (params) => {
        spy.readProgressCalls.push(params.workspaceRoot);
        return Promise.resolve(null);
      },
      resetRetryCounter: (sessionId) => {
        spy.resetRetryCalls.push(sessionId);
      },
      resolveSession: (sessionId) => {
        spy.resolveSessionCalls.push(sessionId);
        return {
          initiativeSlug: "demo-workspace",
          stage: "quality_gates",
          workspacePath: "/tmp/demo-workspace",
        };
      },
      sessionId: SESSION_ID,
      source: "typed-fallback",
      writeAcceptanceFlag: (params) => {
        spy.writeCalls.push(params.workspaceRoot);
        return Promise.resolve({ status: "patched" });
      },
    },
    spy,
  };
};

test("runner rejects while accept-contract side effects are disabled", async () => {
  const { deps, spy } = buildRunnerDeps();
  const decision = await runQualityGatesAcceptContractCommand(deps);

  assert.equal(decision.kind, "rejected");
  assert.equal(decision.stage, "quality_gates");
  if (decision.kind === "rejected") {
    assert.match(decision.reasons[0] ?? "", DISABLED_REASON_RE);
  }
  assert.deepEqual(spy.logCalls, [
    {
      message:
        "Quality Gates accept-contract side effects are disabled while the managed workflow orchestration cluster is being rewritten.",
      payload: {
        sessionId: SESSION_ID,
        source: "typed-fallback",
      },
    },
  ]);
});

test("runner does not mutate progress, audit, or provider flow while disabled", async () => {
  const { deps, spy } = buildRunnerDeps();
  await runQualityGatesAcceptContractCommand(deps);

  assert.deepEqual(spy.auditCalls, []);
  assert.deepEqual(spy.handleCalls, []);
  assert.deepEqual(spy.injectCalls, []);
  assert.deepEqual(spy.markAcceptedCalls, []);
  assert.deepEqual(spy.readGitCalls, []);
  assert.deepEqual(spy.readProgressCalls, []);
  assert.deepEqual(spy.resetRetryCalls, []);
  assert.deepEqual(spy.resolveSessionCalls, []);
  assert.deepEqual(spy.writeCalls, []);
});
