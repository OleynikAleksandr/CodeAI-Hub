import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { collectWorkflowStepSessionCleanupPaths } from "./workflow-step-clear-session-cleanup";

const writeTextFile = async (
  filePath: string,
  content: string
): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
};

const sessionMetaLine = (params: {
  readonly baseInstructionsText?: string;
  readonly cwd: string;
  readonly id: string;
}): string =>
  `${JSON.stringify({
    type: "session_meta",
    payload: {
      id: params.id,
      cwd: params.cwd,
      base_instructions: params.baseInstructionsText
        ? { text: params.baseInstructionsText }
        : undefined,
    },
  })}\n`;

test("workflow clear cleanup includes Codex native workflow and translation sessions", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-clear-codex-native-")
  );
  const homeRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-clear-codex-native-home-")
  );
  const workspaceSlug = "demo-workspace";
  const previousHome = process.env.HOME;
  try {
    process.env.HOME = homeRoot;
    await writeTextFile(
      path.join(
        workspaceRoot,
        ".codeai-hub",
        workspaceSlug,
        "continuity",
        "index.json"
      ),
      JSON.stringify({
        entries: [
          {
            stage: "description",
            rootSessionId: "description-root",
            providerId: "codexCli",
            providerSessionId: "codex-native-workflow-id",
          },
        ],
      })
    );
    const nativeRoot = path.join(
      homeRoot,
      ".codeai-hub/providers/codex/home/sessions/2026/05/23"
    );
    const workflowNativePath = path.join(nativeRoot, "rollout-random.jsonl");
    const translationNativePath = path.join(
      nativeRoot,
      "rollout-translation.jsonl"
    );
    const unrelatedNativePath = path.join(nativeRoot, "rollout-other.jsonl");
    await writeTextFile(
      workflowNativePath,
      sessionMetaLine({ id: "codex-native-workflow-id", cwd: workspaceRoot })
    );
    await writeTextFile(
      translationNativePath,
      sessionMetaLine({
        id: "codex-native-translation-id",
        cwd: path.join(os.tmpdir(), "codeai-codex-translation-test"),
        baseInstructionsText:
          "You are a precise translation engine for CodeAI Hub. Translate only.",
      })
    );
    await writeTextFile(
      unrelatedNativePath,
      sessionMetaLine({ id: "other-session", cwd: "/tmp/unrelated" })
    );

    const cleanupPaths = await collectWorkflowStepSessionCleanupPaths({
      workspacePath: workspaceRoot,
      workspaceSlug,
      target: { kind: "workflow_stage", stage: "description" },
    });

    assert.equal(cleanupPaths.includes(workflowNativePath), true);
    assert.equal(cleanupPaths.includes(translationNativePath), true);
    assert.equal(cleanupPaths.includes(unrelatedNativePath), false);
  } finally {
    process.env.HOME = previousHome;
    await rm(workspaceRoot, { force: true, recursive: true });
    await rm(homeRoot, { force: true, recursive: true });
  }
});
