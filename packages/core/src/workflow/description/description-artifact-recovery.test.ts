import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { recoverDescriptionBranchSnapshot } from "./description-artifact-recovery";
import type { DescriptionStepSnapshot } from "./description-step-types";

const createWorkspaceHarness = async (
  workspaceSlug: string
): Promise<{
  readonly workspaceRoot: string;
  readonly descriptionDir: string;
}> => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "description-artifact-recovery-")
  );
  const descriptionDir = path.join(
    workspaceRoot,
    ".codeai-hub",
    workspaceSlug,
    "description"
  );
  await mkdir(descriptionDir, { recursive: true });
  return { workspaceRoot, descriptionDir };
};

test("recoverDescriptionBranchSnapshot rebuilds questionnaire and draft paths from canonical files", async () => {
  const workspaceSlug = "workspace-recovery-draft";
  const { workspaceRoot, descriptionDir } =
    await createWorkspaceHarness(workspaceSlug);

  try {
    await writeFile(
      path.join(descriptionDir, "questionnaire.md"),
      "# Questionnaire\n"
    );
    await writeFile(
      path.join(descriptionDir, "description.md"),
      "# Draft description\n"
    );

    const recovered = await recoverDescriptionBranchSnapshot({
      workspaceRoot,
      workspaceSlug,
      snapshot: null,
    });

    assert.equal(
      recovered?.questionnairePath,
      `.codeai-hub/${workspaceSlug}/description/questionnaire.md`
    );
    assert.equal(
      recovered?.draftPath,
      `.codeai-hub/${workspaceSlug}/description/description.md`
    );
    assert.equal(recovered?.finalPath, undefined);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("recoverDescriptionBranchSnapshot prefers final artifact and keeps session refs from snapshot", async () => {
  const workspaceSlug = "workspace-recovery-final";
  const { workspaceRoot, descriptionDir } =
    await createWorkspaceHarness(workspaceSlug);
  const snapshot: DescriptionStepSnapshot = {
    workspaceSlug,
    workspacePath: workspaceRoot,
    createdAt: "2026-03-12T10:00:00.000Z",
    updatedAt: "2026-03-12T10:00:00.000Z",
    questionnairePath: `.codeai-hub/${workspaceSlug}/description/questionnaire.md`,
    collectorSession: {
      providerId: "codexCli",
      providerSessionId: "codex-provider-session",
      jsonlPath: "/tmp/workspace-recovery-final/dialog.jsonl",
    },
    sessionKind: "collector",
  };

  try {
    await writeFile(
      path.join(descriptionDir, "Final_Description.md"),
      "# Final description\n"
    );

    const recovered = await recoverDescriptionBranchSnapshot({
      workspaceRoot,
      workspaceSlug,
      snapshot,
    });

    assert.equal(
      recovered?.finalPath,
      `.codeai-hub/${workspaceSlug}/description/Final_Description.md`
    );
    assert.equal(recovered?.questionnairePath, undefined);
    assert.equal(recovered?.draftPath, undefined);
    assert.deepEqual(recovered?.collectorSession, snapshot.collectorSession);
    assert.equal(recovered?.sessionKind, "collector");
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
