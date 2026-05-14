import assert from "node:assert/strict";
import test from "node:test";
import { runApplicationSkeletonAcceptContractCommand } from "./managed-stage-accept-contract-runner";

test("Application Skeleton accept-contract runner is fail-closed without side effects", async () => {
  const sideEffects: string[] = [];
  const decision = await runApplicationSkeletonAcceptContractCommand({
    sessionId: "session-as-runner",
    source: "typed-fallback",
    appendAudit: () => {
      sideEffects.push("audit");
      return Promise.resolve();
    },
    handle: () => {
      sideEffects.push("handle");
    },
    injectAcceptanceTaskPair: () => {
      sideEffects.push("inject");
      return Promise.resolve(true);
    },
    logger: {
      info: (message) => {
        sideEffects.push(`log:${message}`);
      },
    },
    markAccepted: () => {
      sideEffects.push("markAccepted");
    },
    readApplicationSkeletonProgress: () => {
      sideEffects.push("readProgress");
      return Promise.resolve(null);
    },
    readManagedGit: () => {
      sideEffects.push("readGit");
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
    resetRetryCounter: () => {
      sideEffects.push("resetRetry");
    },
    resolveSession: () => {
      sideEffects.push("resolveSession");
      return {
        initiativeSlug: "demo-workspace",
        stage: "application_skeleton",
        workspacePath: "/tmp/demo-workspace",
      };
    },
    writeAcceptanceFlag: () => {
      sideEffects.push("writeAcceptance");
      return Promise.resolve({ status: "patched" });
    },
  });

  assert.equal(decision.kind, "rejected");
  assert.equal(decision.stage, "application_skeleton");
  assert.equal(decision.reasons.length, 1);
  assert.deepEqual(
    sideEffects.filter((entry) => !entry.startsWith("log:")),
    []
  );
  assert.equal(sideEffects.length, 1);
});
