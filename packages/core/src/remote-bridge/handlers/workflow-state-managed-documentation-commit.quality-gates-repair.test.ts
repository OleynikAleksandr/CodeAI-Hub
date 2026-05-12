import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { ManagedPlanOrchestratorInstaller } from "../../managed-workspace/managed-plan-orchestrator-installer";
import { Logger } from "../../telemetry/logger";
import { ManagedDocumentationCommitTransaction } from "./managed-documentation-commit-transaction";
import type { QualityGatesGuardDecision } from "./quality-gates-contract-guard";
import type { QualityGatesProgressSnapshot } from "./quality-gates-progress";
import { runQualityGatesRepairOrchestration } from "./quality-gates-repair-orchestration";

const execFileAsync = promisify(execFile);

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const runGit = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<string> => {
  const { stdout } = await execFileAsync("git", [...args], {
    cwd: workspaceRoot,
  });
  return stdout.trim();
};

const initManagedWorkspace = async (workspaceRoot: string): Promise<void> => {
  await runGit(workspaceRoot, ["init"]);
  await runGit(workspaceRoot, ["config", "user.email", "test@example.com"]);
  await runGit(workspaceRoot, ["config", "user.name", "CodeAI Test"]);
  await writeWorkspaceFile(workspaceRoot, "README.md", "# Demo\n");
  await new ManagedPlanOrchestratorInstaller().install(workspaceRoot, {
    initialStage: "quality_gates",
  });
  await runGit(workspaceRoot, ["add", "."]);
  await runGit(workspaceRoot, [
    "-c",
    "core.hooksPath=",
    "commit",
    "-m",
    "test: managed baseline",
  ]);
};

const buildProgress = (
  overrides: Partial<QualityGatesProgressSnapshot> = {}
): QualityGatesProgressSnapshot => ({
  accepted: false,
  acceptanceCommitted: false,
  commandContractReady: false,
  integrated: false,
  integrationState: "draft",
  jsonExists: false,
  markdownExists: false,
  substep: "artifact",
  validationErrors: [],
  ...overrides,
});

test("managed commit transaction commits Quality Gates repair attempt evidence", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "qg-repair-attempt-commit-")
  );

  try {
    await initManagedWorkspace(workspaceRoot);

    // Pre-condition: orchestrator already injected a repair task pair.
    // Simulate that by patching the active plan state to a repair task id.
    const planPath = path.join(
      workspaceRoot,
      "doc/TODO/stages/quality-gates/todo-plan.md"
    );
    const planText = await readFile(planPath, "utf8");
    const patched = planText
      .replace(
        '"currentTaskId": "quality-gates.phase1.draft.task1"',
        '"currentTaskId": "quality-gates.phase1.draft.repair1.task1"'
      )
      .replace(
        '"expectedCommitMessage": "docs: draft quality gates contract"',
        '"expectedCommitMessage": "docs: repair quality gates phase1.draft attempt 1"'
      )
      .replace(
        "1. [IN_PROGRESS] `quality-gates.phase1.draft.task1`",
        "1. [BLOCKED] `quality-gates.phase1.draft.task1`"
      )
      .replace(
        "2. [TODO] Git Commit: `docs: draft quality gates contract` (hash: TBD)",
        `2. [BLOCKED] Git Commit: \`docs: draft quality gates contract\` (hash: not-created-core-rejected-before-commit)
3. [IN_PROGRESS] \`quality-gates.phase1.draft.repair1.task1\` Core rejected the previous Quality Gates attempt; repair only the named artifact set (scope: \`.codeai-hub/**/quality_gates/**, .codeai-hub/**/workflow/revisions/quality-gates/attempts/**\`; expected commit: \`docs: repair quality gates phase1.draft attempt 1\`).
4. [TODO] Git Commit: \`docs: repair quality gates phase1.draft attempt 1\` (hash: TBD)`
      );
    await writeFile(planPath, patched, "utf8");
    await runGit(workspaceRoot, ["add", "."]);
    await runGit(workspaceRoot, [
      "-c",
      "core.hooksPath=",
      "commit",
      "-m",
      "test: inject quality gates repair task",
    ]);

    // Repair orchestrator writes attempt evidence (we already are in the repair task).
    const decision: QualityGatesGuardDecision = {
      details: ["quality-gates.json is missing"],
      kind: "repair_invalid_draft",
      reason: "implicit_readiness_with_invalid_draft",
    };
    const orchestrationResult = await runQualityGatesRepairOrchestration({
      decision,
      logger: new Logger("error"),
      managedGitStatus: {
        clean: false,
        dirtyByStage: {
          application_skeleton: [],
          diagram_modules: [],
          quality_gates: [],
        },
        dirtyFiles: [],
      },
      phase: "phase_1_draft",
      progress: buildProgress(),
      workspaceRoot,
      workspaceSlug: "demo",
    });
    assert.equal(orchestrationResult.status, "evidence_written");

    const evidencePath = orchestrationResult.evidencePath ?? "";
    assert.ok(evidencePath);

    const result =
      await new ManagedDocumentationCommitTransaction().commitAcceptedStage({
        workspaceRoot,
        workspaceSlug: "demo",
      });

    assert.equal(
      result.status,
      "committed",
      `unmanaged: ${result.unmanagedDirtyFiles?.join(", ") ?? "n/a"}; owned: ${result.ownedFiles?.join(", ") ?? "n/a"}`
    );
    assert.equal(
      result.ownedFiles.some((file) => file === evidencePath),
      true,
      `Expected evidence path to be committed; got ${result.ownedFiles.join(", ")}`
    );
    assert.equal(await runGit(workspaceRoot, ["status", "--short"]), "");
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
