import assert from "node:assert/strict";
import test from "node:test";
import type { ApplicationSkeletonAcceptanceWriteResult } from "./application-skeleton-acceptance-writer";
import type { ApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import type { ManagedGitStatus } from "./managed-git-stage-gate";
import { runApplicationSkeletonAcceptContractCommand } from "./managed-stage-accept-contract-runner";

const SESSION_ID = "session-as-runner";
const WORKSPACE_PATH = "/tmp/demo-workspace";
const WORKSPACE_SLUG = "demo-workspace";
const AUDIT_TEXT_RE = /Application Skeleton acceptance via typed-fallback/u;

const buildAcceptableProgress = (
  overrides: Partial<ApplicationSkeletonProgressSnapshot> = {}
): ApplicationSkeletonProgressSnapshot => ({
  accepted: false,
  mapExists: true,
  mappingReady: true,
  markdownExists: true,
  materializationState: "artifact",
  materialized: false,
  observedMaterialization: false,
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
  readonly logCalls: Array<{
    message: string;
    payload?: Record<string, unknown>;
  }>;
  readonly markAcceptedCalls: string[];
  readonly resetRetryCalls: string[];
  readonly writeCalls: Array<{ workspaceRoot: string; workspaceSlug: string }>;
}

const buildRunnerDeps = (
  progress: ApplicationSkeletonProgressSnapshot | null,
  writeResult: ApplicationSkeletonAcceptanceWriteResult = { status: "patched" }
): {
  readonly deps: Parameters<
    typeof runApplicationSkeletonAcceptContractCommand
  >[0];
  readonly spy: RunnerSpy;
} => {
  const spy: RunnerSpy = {
    auditCalls: [],
    handleCalls: [],
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
      logger: {
        info: (message, payload) => {
          spy.logCalls.push({ message, payload });
        },
      },
      markAccepted: (sessionId) => {
        spy.markAcceptedCalls.push(sessionId);
      },
      readApplicationSkeletonProgress: () => Promise.resolve(progress),
      readManagedGit: () => Promise.resolve(buildCleanGitStatus()),
      resetRetryCounter: (sessionId) => {
        spy.resetRetryCalls.push(sessionId);
      },
      resolveSession: () => ({
        initiativeSlug: WORKSPACE_SLUG,
        stage: "application_skeleton",
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

test("runner patches application-skeleton-map.json on accepted decision (Variant A write-path)", async () => {
  const { deps, spy } = buildRunnerDeps(buildAcceptableProgress());
  const decision = await runApplicationSkeletonAcceptContractCommand(deps);

  assert.equal(decision.kind, "accepted");
  assert.deepEqual(spy.writeCalls, [
    { workspaceRoot: WORKSPACE_PATH, workspaceSlug: WORKSPACE_SLUG },
  ]);
  assert.deepEqual(spy.markAcceptedCalls, [SESSION_ID]);
  assert.deepEqual(spy.handleCalls, [SESSION_ID]);
  assert.equal(spy.auditCalls.length, 1);
  assert.match(spy.auditCalls[0]?.text ?? "", AUDIT_TEXT_RE);
  const writeLogEntry = spy.logCalls.find(
    (entry) =>
      entry.message === "Application Skeleton acceptance map.json write"
  );
  assert.ok(writeLogEntry, "Expected write-result log entry");
  assert.equal(writeLogEntry?.payload?.status, "patched");
});

test("runner does not patch map.json when the handler rejects acceptance", async () => {
  const { deps, spy } = buildRunnerDeps(
    buildAcceptableProgress({ mapExists: false })
  );
  const decision = await runApplicationSkeletonAcceptContractCommand(deps);

  assert.equal(decision.kind, "rejected");
  assert.deepEqual(spy.writeCalls, []);
  assert.deepEqual(spy.markAcceptedCalls, []);
  assert.deepEqual(spy.handleCalls, []);
  assert.equal(spy.auditCalls.length, 0);
});

test("runner forwards writer status into the log payload", async () => {
  // A writer that reports `map_missing` should still let the runner complete
  // the marker + dispatch flow (the marker is volatile and benign), but the
  // log payload must surface the writer status so operators can see what
  // happened without crawling the filesystem.
  const { deps, spy } = buildRunnerDeps(buildAcceptableProgress(), {
    mapPath:
      "/tmp/demo-workspace/.codeai-hub/demo-workspace/application_skeleton/application-skeleton-map.json",
    status: "map_missing",
  });
  const decision = await runApplicationSkeletonAcceptContractCommand(deps);

  assert.equal(decision.kind, "accepted");
  assert.deepEqual(spy.markAcceptedCalls, [SESSION_ID]);
  assert.deepEqual(spy.handleCalls, [SESSION_ID]);
  const writeLogEntry = spy.logCalls.find(
    (entry) =>
      entry.message === "Application Skeleton acceptance map.json write"
  );
  assert.ok(writeLogEntry);
  assert.equal(writeLogEntry?.payload?.status, "map_missing");
});
