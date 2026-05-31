import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  resolveManagedWorkflowDiagnosticLogPath,
  traceManagedWorkflowDiagnostic,
} from "./managed-workflow-diagnostic-trace";

const withLogRoot = (run: (logRoot: string) => void): void => {
  const previous = process.env.CODEAI_HUB_LOGS_DIR;
  const logRoot = mkdtempSync(path.join(tmpdir(), "codeai-managed-logs-"));
  process.env.CODEAI_HUB_LOGS_DIR = logRoot;
  try {
    run(logRoot);
  } finally {
    if (previous === undefined) {
      process.env.CODEAI_HUB_LOGS_DIR = undefined;
    } else {
      process.env.CODEAI_HUB_LOGS_DIR = previous;
    }
  }
};

const MANAGED_STAGE_CASES = [
  ["diagram_modules", "diagram-modules-lifecycle.jsonl"],
  ["application_skeleton", "application-skeleton-lifecycle.jsonl"],
  ["quality_gates", "quality-gates-baseline-lifecycle.jsonl"],
] as const;

test("managed technical stage diagnostics are written under user-level logs", () => {
  withLogRoot((logRoot) => {
    for (const [stage, fileName] of MANAGED_STAGE_CASES) {
      const session = {
        id: `session-${stage}`,
        initiativeSlug: "workspace-a",
        stage,
        workspacePath: "/workspace/project",
      } as const;

      traceManagedWorkflowDiagnostic({
        content: "provider-visible continuation",
        event: "session.message.appended",
        session,
      });

      const logPath = resolveManagedWorkflowDiagnosticLogPath(session);
      assert.equal(
        logPath,
        path.join(logRoot, "managed-workflow", "project", fileName)
      );
      assert.ok(!logPath.startsWith("/workspace/project/"));

      const [line] = readFileSync(logPath, "utf8").trim().split("\n");
      const entry = JSON.parse(line ?? "{}") as {
        readonly content?: string;
        readonly event?: string;
        readonly session?: {
          readonly stage?: string;
          readonly workspacePath?: string;
        };
      };
      assert.equal(entry.event, "session.message.appended");
      assert.equal(entry.content, "provider-visible continuation");
      assert.equal(entry.session?.stage, stage);
      assert.equal(entry.session?.workspacePath, "/workspace/project");
    }
  });
});

test("non-managed stage diagnostics are ignored", () => {
  withLogRoot((logRoot) => {
    traceManagedWorkflowDiagnostic({
      content: "description message",
      event: "session.message.appended",
      session: {
        id: "session-description",
        initiativeSlug: "workspace-a",
        stage: "description",
        workspacePath: "/workspace/project",
      },
    });

    assert.equal(
      existsSync(path.join(logRoot, "managed-workflow", "project")),
      false
    );
  });
});
