import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
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

test("Diagram Modules diagnostics are written under user-level logs", () => {
  withLogRoot((logRoot) => {
    const session = {
      id: "session-1",
      initiativeSlug: "workspace-a",
      stage: "diagram_modules",
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
      path.join(
        logRoot,
        "managed-workflow",
        "workspace-a",
        "diagram-modules-lifecycle.jsonl"
      )
    );
    assert.ok(!logPath.startsWith("/workspace/project/"));

    const [line] = readFileSync(logPath, "utf8").trim().split("\n");
    const entry = JSON.parse(line ?? "{}") as {
      readonly content?: string;
      readonly event?: string;
      readonly session?: { readonly workspacePath?: string };
    };
    assert.equal(entry.event, "session.message.appended");
    assert.equal(entry.content, "provider-visible continuation");
    assert.equal(entry.session?.workspacePath, "/workspace/project");
  });
});
