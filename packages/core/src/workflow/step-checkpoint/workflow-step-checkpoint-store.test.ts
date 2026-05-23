import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { WorkflowStepCheckpointFacade } from "./workflow-step-checkpoint-facade";

const writeTextFile = async (
  filePath: string,
  content: string
): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
};

test("WorkflowStepCheckpointFacade restores workspace and user-space state exactly", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-step-checkpoint-")
  );
  const userSpaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-step-checkpoint-home-")
  );
  const workspaceSlug = "demo-workspace";
  const facade = new WorkflowStepCheckpointFacade({
    clock: () => "2026-05-23T00:00:00.000Z",
  });
  try {
    await writeTextFile(
      path.join(
        workspaceRoot,
        ".codeai-hub",
        workspaceSlug,
        "description",
        "questionnaire.md"
      ),
      "filled questionnaire\n"
    );
    await writeTextFile(
      path.join(
        workspaceRoot,
        "doc",
        "TODO",
        "stages",
        "description",
        "todo.md"
      ),
      "pre-step todo\n"
    );

    await facade.ensureCheckpoint({
      stage: "description",
      userSpaceRoot,
      workspaceRoot,
      workspaceSlug,
    });

    await writeTextFile(
      path.join(
        workspaceRoot,
        ".codeai-hub",
        workspaceSlug,
        "description",
        "Final_Description.md"
      ),
      "generated final\n"
    );
    await writeTextFile(
      path.join(
        workspaceRoot,
        ".codeai-hub",
        workspaceSlug,
        "workflow",
        "state.json"
      ),
      '{"stage":"description"}\n'
    );
    await writeTextFile(
      path.join(
        userSpaceRoot,
        "sessions",
        workspaceSlug,
        "codexCli",
        "turn.jsonl"
      ),
      "session\n"
    );
    await writeTextFile(
      path.join(workspaceRoot, "product-parts", "generated", "index.ts"),
      "export {};\n"
    );

    const restored = await facade.restoreCheckpoint({
      stage: "description",
      userSpaceRoot,
      workspaceRoot,
      workspaceSlug,
    });

    assert.equal(restored, true);
    assert.equal(
      await readFile(
        path.join(
          workspaceRoot,
          ".codeai-hub",
          workspaceSlug,
          "description",
          "questionnaire.md"
        ),
        "utf8"
      ),
      "filled questionnaire\n"
    );
    await assert.rejects(() =>
      readFile(
        path.join(
          workspaceRoot,
          ".codeai-hub",
          workspaceSlug,
          "description",
          "Final_Description.md"
        ),
        "utf8"
      )
    );
    await assert.rejects(() =>
      readFile(
        path.join(
          userSpaceRoot,
          "sessions",
          workspaceSlug,
          "codexCli",
          "turn.jsonl"
        ),
        "utf8"
      )
    );
    await assert.rejects(() =>
      readFile(
        path.join(workspaceRoot, "product-parts", "generated", "index.ts"),
        "utf8"
      )
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
    await rm(userSpaceRoot, { force: true, recursive: true });
  }
});

test("WorkflowStepCheckpointFacade keeps the first checkpoint for restart-stable restore", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-step-checkpoint-stable-")
  );
  const workspaceSlug = "demo-workspace";
  const facade = new WorkflowStepCheckpointFacade();
  try {
    await writeTextFile(
      path.join(
        workspaceRoot,
        ".codeai-hub",
        workspaceSlug,
        "description",
        "questionnaire.md"
      ),
      "first\n"
    );
    await facade.ensureCheckpoint({
      stage: "description",
      workspaceRoot,
      workspaceSlug,
    });
    await writeTextFile(
      path.join(
        workspaceRoot,
        ".codeai-hub",
        workspaceSlug,
        "description",
        "questionnaire.md"
      ),
      "second\n"
    );
    await facade.ensureCheckpoint({
      stage: "description",
      workspaceRoot,
      workspaceSlug,
    });
    await facade.restoreCheckpoint({
      stage: "description",
      workspaceRoot,
      workspaceSlug,
    });

    assert.equal(
      await readFile(
        path.join(
          workspaceRoot,
          ".codeai-hub",
          workspaceSlug,
          "description",
          "questionnaire.md"
        ),
        "utf8"
      ),
      "first\n"
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
