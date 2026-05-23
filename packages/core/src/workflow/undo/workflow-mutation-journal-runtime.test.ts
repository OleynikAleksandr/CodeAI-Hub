import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { captureWorkflowMutation } from "./workflow-mutation-journal-runtime";
import {
  undoWorkflowStepAction,
  WorkflowStepUndoLedgerStore,
} from "./workflow-step-undo-ledger";

const writeTextFile = async (
  filePath: string,
  content: string
): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
};

test("captureWorkflowMutation records workspace and user-space diffs without manual path registration", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-mutation-journal-")
  );
  const userSpaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-mutation-journal-home-")
  );
  const workspaceSlug = "demo-workspace";
  try {
    await writeTextFile(
      path.join(
        workspaceRoot,
        ".codeai-hub",
        workspaceSlug,
        "description",
        "questionnaire.md"
      ),
      "answers\n"
    );

    await captureWorkflowMutation(
      {
        source: "test_capture",
        stage: "description",
        userSpaceRoot,
        workspaceRoot,
        workspaceSlug,
      },
      async () => {
        await writeTextFile(
          path.join(
            workspaceRoot,
            ".codeai-hub",
            workspaceSlug,
            "description",
            "Final_Description.md"
          ),
          "final\n"
        );
        await writeTextFile(
          path.join(
            userSpaceRoot,
            "sessions",
            workspaceSlug,
            "codexCli",
            "codex-demo-description.jsonl"
          ),
          "session\n"
        );
      }
    );

    const ledger = await new WorkflowStepUndoLedgerStore({
      workspaceRoot,
      workspaceSlug,
    }).read();
    assert.deepEqual(
      ledger?.entries.map((entry) => ({
        kind: entry.kind,
        path: entry.relativePath,
        root: entry.root ?? "workspace",
        source: entry.source,
      })),
      [
        {
          kind: "write_file",
          path: `.codeai-hub/${workspaceSlug}/description/Final_Description.md`,
          root: "workspace",
          source: "test_capture",
        },
        {
          kind: "create_directory",
          path: `sessions/${workspaceSlug}`,
          root: "user_space",
          source: "test_capture",
        },
        {
          kind: "create_directory",
          path: `sessions/${workspaceSlug}/codexCli`,
          root: "user_space",
          source: "test_capture",
        },
        {
          kind: "write_file",
          path: `sessions/${workspaceSlug}/codexCli/codex-demo-description.jsonl`,
          root: "user_space",
          source: "test_capture",
        },
      ]
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
    await rm(userSpaceRoot, { force: true, recursive: true });
  }
});

test("undo ledger resolves user-space entries under home .codeai-hub", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-mutation-journal-resolve-")
  );
  const homeRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-mutation-journal-resolve-home-")
  );
  const previousHome = process.env.HOME;
  const workspaceSlug = "demo-workspace";
  try {
    process.env.HOME = homeRoot;
    const userSpaceFile = path.join(
      homeRoot,
      ".codeai-hub",
      "sessions",
      workspaceSlug,
      "codexCli",
      "codex-demo-description.jsonl"
    );
    await writeTextFile(userSpaceFile, "session\n");
    const ledgerStore = new WorkflowStepUndoLedgerStore({
      workspaceRoot,
      workspaceSlug,
    });
    await ledgerStore.append([
      {
        kind: "write_file",
        relativePath: `sessions/${workspaceSlug}/codexCli/codex-demo-description.jsonl`,
        root: "user_space",
        source: "test_capture",
        stage: "description",
      },
    ]);
    const ledger = await ledgerStore.read();
    const entry = ledger?.entries[0];
    assert.ok(entry);
    const action = {
      absolutePath: ledgerStore.resolveEntryPath(entry),
      entry,
    };
    assert.ok(action.absolutePath);
    await undoWorkflowStepAction(
      { absolutePath: action.absolutePath, entry },
      [],
      []
    );

    await assert.rejects(() => readFile(userSpaceFile, "utf8"));
  } finally {
    process.env.HOME = previousHome;
    await rm(workspaceRoot, { force: true, recursive: true });
    await rm(homeRoot, { force: true, recursive: true });
  }
});
