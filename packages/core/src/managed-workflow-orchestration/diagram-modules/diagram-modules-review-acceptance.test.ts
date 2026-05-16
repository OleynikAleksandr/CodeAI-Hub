import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { ManagedWorkflowScaffoldInstaller } from "../managed-workflow-scaffold-installer";
import {
  acceptDiagramModulesReviewWithoutRevision,
  isDiagramModulesReviewOpen,
} from "./diagram-modules-review-acceptance";

const REVIEW_TASK_RE =
  /"currentTaskId": "diagram-modules\.phase2\.review\.task1"/u;
const RETURN_TASK_RE =
  /"currentTaskId": "diagram-modules\.phase3\.user-return\.task1"/u;
const USER_RETURN_STREAM_RE = /### Stream: User Return And Revisions/u;
const DIAGRAM_COMPLETED_RE = /"completedStages": \[\n {4}"diagram_modules"/u;
const APP_UNLOCKED_RE = /"application_skeleton"/u;
const APP_ACTIVE_RE = /"activeStage": "application_skeleton"/u;
const REVIEW_DISPOSITION_RE =
  /Git Commit: `docs: open diagram modules user review` \(hash: [0-9a-f]{7,}\)/u;

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const readWorkspaceFile = (
  workspaceRoot: string,
  relativePath: string
): Promise<string> => readFile(path.join(workspaceRoot, relativePath), "utf8");

const prepareReviewWorkspace = async (workspaceRoot: string): Promise<void> => {
  await new ManagedWorkflowScaffoldInstaller().installDiagramModulesScaffold({
    workspaceRoot,
  });
  await writeWorkspaceFile(
    workspaceRoot,
    "doc/TODO/stages/diagram-modules/todo-plan.md",
    `# Diagram Modules Managed TODO Plan

<!-- codeai-plan-state:start -->
\`\`\`json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "managed-workspace-diagram-modules",
  "branch": "main",
  "baseHead": "TBD",
  "lastRecordedCommit": "3836dc1",
  "planningSource": ".codeai-hub/workflow/index.json",
  "currentTaskId": "diagram-modules.phase2.review.task1",
  "expectedCommitMessage": "docs: open diagram modules user review",
  "debt": null
}
\`\`\`
<!-- codeai-plan-state:end -->

## Phase 2 — Diagram Modules User Review

### Stream: User-Led Review

13. [DONE] \`diagram-modules.phase2.review.task1\` User reviews the accepted Diagram Modules Product Part artifacts before the stage can be completed (scope: user workflow; expected commit: \`docs: open diagram modules user review\`).
14. [DONE] Git Commit: \`docs: open diagram modules user review\` (hash: 3836dc1)
`
  );
};

test("Diagram Modules review acceptance opens persistent return and unlocks Application Skeleton", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "diagram-review-acceptance-")
  );
  try {
    await prepareReviewWorkspace(workspaceRoot);

    assert.equal(await isDiagramModulesReviewOpen(workspaceRoot), true);

    await acceptDiagramModulesReviewWithoutRevision({ workspaceRoot });

    const stagePlan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/diagram-modules/todo-plan.md"
    );
    assert.doesNotMatch(stagePlan, REVIEW_TASK_RE);
    assert.match(stagePlan, RETURN_TASK_RE);
    assert.match(stagePlan, USER_RETURN_STREAM_RE);
    assert.match(stagePlan, REVIEW_DISPOSITION_RE);

    const workspacePlan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/workspace.plan.md"
    );
    assert.match(workspacePlan, DIAGRAM_COMPLETED_RE);
    assert.match(workspacePlan, APP_UNLOCKED_RE);
    assert.match(workspacePlan, APP_ACTIVE_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
