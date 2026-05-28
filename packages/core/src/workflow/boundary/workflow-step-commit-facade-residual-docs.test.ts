import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { SessionRequestHandlerPreliminaryReviewCommitter } from "../../remote-bridge/handlers/session-request-handler-preliminary-review-committer";
import { bootstrapWorkspaceRuntimeCapsule } from "../runtime/workspace-runtime-capsule";
import { WorkflowStepCommitFacade } from "./workflow-step-commit-facade";

const execFileAsync = promisify(execFile);
const WORKSPACE_SLUG = "demo-workspace";
const ACCEPTED_STEP_COMMIT_RE = /codeai-step: Description accepted/u;
const RESIDUAL_DOC_COMMIT_RE = /codeai-step: Description residual documents/u;
const RESIDUAL_DOC_DIRTY_RE = /docs\//u;
const RESIDUAL_DOC_MESSAGE_RE = /Зафиксированные пути:\n- docs\//u;

const git = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<string> => {
  const { stdout } = await execFileAsync("git", args, { cwd: workspaceRoot });
  return stdout.trim();
};

const writeText = async (filePath: string, content: string): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
};

test("accepted step commit auto-commits workflow-neutral residual documents", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "step-residual-docs-")
  );
  try {
    const { capsule } = await bootstrapWorkspaceRuntimeCapsule({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    await writeText(
      path.join(capsule.descriptionRoot.absolutePath, "Final_Description.md"),
      "# Final Description\n"
    );
    await writeText(
      path.join(workspaceRoot, "docs", "decision-note.md"),
      "# Decision Note\n"
    );

    const result = await new WorkflowStepCommitFacade().commitAcceptedStep({
      stage: "description",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.deepEqual(result.residualDocumentCommit?.paths, ["docs/"]);
    assert.match(
      await git(workspaceRoot, ["log", "--oneline", "-1"]),
      RESIDUAL_DOC_COMMIT_RE
    );
    assert.match(
      await git(workspaceRoot, ["log", "--oneline", "-2"]),
      ACCEPTED_STEP_COMMIT_RE
    );
    assert.equal(await git(workspaceRoot, ["status", "--porcelain"]), "");
    assert.match(await git(workspaceRoot, ["ls-files"]), RESIDUAL_DOC_DIRTY_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("preliminary review reports residual document auto-commits to the user", async () => {
  const coreMessages: Array<{
    readonly content: string;
    readonly tag?: string;
  }> = [];
  const dialogMessages: Array<{ readonly content: string }> = [];
  const committer = new SessionRequestHandlerPreliminaryReviewCommitter({
    eventMessages: {
      appendCoreMessage: (
        _sessionId: string,
        message: { readonly content: string; readonly tag?: string }
      ) => {
        coreMessages.push(message);
      },
      appendDialogMessage: (
        _sessionId: string,
        message: { readonly content: string }
      ) => {
        dialogMessages.push(message);
      },
    },
    stepCommitFacade: {
      commitAcceptedStep: async () => ({
        commit: { hash: "accepted123", noStagedChanges: false },
        residualDocumentCommit: {
          commit: { hash: "residual456", noStagedChanges: false },
          paths: ["docs/"],
        },
        stage: "description",
      }),
    },
  });

  const handled = await committer.handle({
    content: "подтверждаю",
    hiddenUserMessage: false,
    session: {
      initiativeSlug: WORKSPACE_SLUG,
      messages: [
        {
          content:
            "Core: Description перешёл в пользовательскую проверку.\nПроверьте результат.",
          role: "system",
          tag: "managed-workflow-user-review",
        },
      ],
      stage: "description",
      workspacePath: "/tmp/demo-workspace",
    } as never,
    sessionId: "session-1",
  });

  assert.equal(handled, true);
  assert.equal(dialogMessages.length, 1);
  assert.equal(coreMessages.length, 2);
  assert.match(coreMessages[1]?.content ?? "", RESIDUAL_DOC_MESSAGE_RE);
  assert.equal(coreMessages[1]?.tag, "managed-workflow-validation");
});
