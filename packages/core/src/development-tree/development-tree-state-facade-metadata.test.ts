import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { DevelopmentTreeStateFacade } from "./development-tree-state-facade";

const PART_CONTENT = `# Product Part: Project Manager

## Identity

| Field | Value |
| ----- | ----- |
| Part ID | \`project-manager\` |

## Owned Clusters

### \`workflow-and-artifact-ui\`

| \`module-id\` | Responsibility |
| --- | --- |
| \`workflow-step-controller\` | Controls workflow steps. |

## Standalone Modules
`;

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

test("DevelopmentTreeStateFacade exposes draft artifacts and sessions per node", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "devtree-metadata-")
  );
  const workspaceSlug = "demo-workspace";
  const moduleWorkflowPath =
    "development_tree/materialized/product-parts/project-manager/clusters/workflow-and-artifact-ui/modules/workflow-step-controller";
  try {
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts/project-manager.md`,
      PART_CONTENT
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/${moduleWorkflowPath}/ModuleSpec.draft.md`,
      "# Module Spec\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/continuity/${moduleWorkflowPath}/codex-root/chain.json`,
      `${JSON.stringify(
        {
          rootSessionId: "codex-root",
          dialogId:
            "codex-root-project-manager-workflow-and-artifact-ui-workflow-step-controller",
          workspaceSlug,
          stage: moduleWorkflowPath,
          segments: [
            {
              sessionId: "runtime-session",
              providerId: "codexCli",
              providerSessionId: "provider-session",
              createdAt: "2026-05-05T07:00:00.000Z",
            },
          ],
          updatedAt: "2026-05-05T07:01:00.000Z",
        },
        null,
        2
      )}\n`
    );

    const snapshot = await new DevelopmentTreeStateFacade().currentSnapshot({
      workspaceRoot,
      workspaceSlug,
      plannedPartIds: ["project-manager"],
      generatedPartIds: ["project-manager"],
    });
    const module = snapshot.parts[0]?.clusters[0]?.modules[0];

    assert.equal(module?.workflowPath, moduleWorkflowPath);
    assert.deepEqual(module?.artifacts, [
      {
        fileName: "ModuleSpec.draft.md",
        path: `.codeai-hub/${workspaceSlug}/${moduleWorkflowPath}/ModuleSpec.draft.md`,
      },
    ]);
    assert.equal(module?.session?.providerId, "codexCli");
    assert.equal(module?.session?.sessionId, "runtime-session");
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
