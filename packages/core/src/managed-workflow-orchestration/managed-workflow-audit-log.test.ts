import assert from "node:assert/strict";
import test from "node:test";
import { ManagedWorkflowAuditLog } from "./managed-workflow-audit-log";

test("audit log records provider-visible core messages as provider message entries", () => {
  const auditLog = new ManagedWorkflowAuditLog();
  auditLog.recordEffect({
    effect: {
      kind: "append_core_message",
      message: "Core asks provider to repair the contract.",
      stageId: "quality_gates",
      visibleToProvider: true,
      visibleToUser: true,
    },
    entryId: "entry-1",
    recordedAt: "2026-05-15T00:00:00.000Z",
  });

  assert.deepEqual(auditLog.list(), [
    {
      category: "provider_message",
      detail: "append_core_message",
      entryId: "entry-1",
      recordedAt: "2026-05-15T00:00:00.000Z",
      stageId: "quality_gates",
    },
  ]);
});

test("audit log records recovery decisions separately from effects", () => {
  const auditLog = new ManagedWorkflowAuditLog();
  const entry = auditLog.recordRecovery({
    detail: "retry provider after idle timeout",
    entryId: "entry-2",
    recordedAt: "2026-05-15T00:01:00.000Z",
    stageId: "application_skeleton",
  });

  assert.equal(entry.category, "recovery");
  assert.equal(auditLog.list().length, 1);
});
