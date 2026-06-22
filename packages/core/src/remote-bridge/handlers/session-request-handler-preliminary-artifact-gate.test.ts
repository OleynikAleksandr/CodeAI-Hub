import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { resolvePreliminaryArtifactGate } from "./session-request-handler-preliminary-artifact-gate";

const WORKSPACE_SLUG = "demo-workspace";
const DESCRIPTION_ARTIFACT_PATH = `.codeai-hub/${WORKSPACE_SLUG}/description/Final_Description.md`;
const DESCRIPTION_ARTIFACT_RE = /Final_Description\.md/u;
const VIRTUAL_SIMULATION_ARTIFACT_PATH = `.codeai-hub/${WORKSPACE_SLUG}/virtual_simulation/virtual-simulation.md`;
const VIRTUAL_SIMULATION_ARTIFACT_RE = /virtual-simulation\.md/u;
const USER_REVIEW_TAG = "managed-workflow-user-review";
const VALIDATION_TAG = "managed-workflow-validation";

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

test("preliminary artifact gate blocks Description handoff until canonical artifact exists", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "preliminary-gate-description-missing-")
  );
  try {
    const result = await resolvePreliminaryArtifactGate({
      stage: "description",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result?.tag, VALIDATION_TAG);
    assert.match(result?.content ?? "", DESCRIPTION_ARTIFACT_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("preliminary artifact gate materializes Description from fenced assistant artifact", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "preliminary-gate-description-local-model-")
  );
  try {
    const result = await resolvePreliminaryArtifactGate({
      assistantMessages: [
        {
          content: [
            `.codeai-hub/${WORKSPACE_SLUG}/description/Final_Description.md`,
            "```markdown",
            "# Final Description: Demo",
            "",
            "## Key User Scenarios",
            "Ready for review.",
            "```",
            "",
            "Отчет: черновик создан.",
          ].join("\n"),
          role: "assistant",
        },
      ],
      stage: "description",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result?.tag, USER_REVIEW_TAG);
    assert.equal(
      await readFile(
        path.join(workspaceRoot, DESCRIPTION_ARTIFACT_PATH),
        "utf8"
      ),
      "# Final Description: Demo\n\n## Key User Scenarios\nReady for review.\n"
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("preliminary artifact gate materializes Description from fragmented live-stream chunks", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "preliminary-gate-description-live-stream-")
  );
  try {
    const answer = [
      "```markdown",
      "# Final Description: Demo",
      "",
      "## Scenarios",
      "Live ready.",
      "```",
      "",
      "Создан черновик `Final_Description.md`.",
    ].join("\n");
    // Live streaming emits one assistant message per delta; split the answer into
    // tiny chunks so no single message keeps the artifact path or the whole fenced
    // block. A leading user prompt verifies the reconstruction stops at non-assistant.
    const liveChunks = answer.match(/[\s\S]{1,4}/gu) ?? [];
    const result = await resolvePreliminaryArtifactGate({
      assistantMessages: [
        { content: "Промпт без артефакта.", role: "user" },
        ...liveChunks.map((content) => ({
          content,
          role: "assistant" as const,
        })),
      ],
      stage: "description",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result?.tag, USER_REVIEW_TAG);
    assert.equal(
      await readFile(
        path.join(workspaceRoot, DESCRIPTION_ARTIFACT_PATH),
        "utf8"
      ),
      "# Final Description: Demo\n\n## Scenarios\nLive ready.\n"
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("preliminary artifact gate materializes Description when the filename is only in the thinking channel", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "preliminary-gate-description-thinking-split-")
  );
  try {
    // Reasoning is split into a thinking message that carries the filename, while
    // the assistant message carries only the fenced block (no filename).
    const result = await resolvePreliminaryArtifactGate({
      assistantMessages: [
        { content: "Промпт без артефакта.", role: "user" },
        {
          content: `Proceeding to write .codeai-hub/${WORKSPACE_SLUG}/description/Final_Description.md now.`,
          role: "thinking",
        },
        {
          content: [
            "```markdown",
            "# Final Description: Demo",
            "",
            "## Scenarios",
            "Ready.",
            "```",
          ].join("\n"),
          role: "assistant",
        },
      ],
      stage: "description",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result?.tag, USER_REVIEW_TAG);
    assert.equal(
      await readFile(
        path.join(workspaceRoot, DESCRIPTION_ARTIFACT_PATH),
        "utf8"
      ),
      "# Final Description: Demo\n\n## Scenarios\nReady.\n"
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("preliminary artifact gate blocks Virtual Simulation handoff until canonical artifact exists", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "preliminary-gate-virtual-missing-")
  );
  try {
    const result = await resolvePreliminaryArtifactGate({
      stage: "virtual_simulation",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result?.tag, VALIDATION_TAG);
    assert.match(result?.content ?? "", VIRTUAL_SIMULATION_ARTIFACT_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("preliminary artifact gate allows Virtual Simulation handoff with canonical artifact", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "preliminary-gate-virtual-ready-")
  );
  try {
    await writeWorkspaceFile(
      workspaceRoot,
      VIRTUAL_SIMULATION_ARTIFACT_PATH,
      "# Virtual Simulation\n\nReady for Diagram Modules.\n"
    );

    const result = await resolvePreliminaryArtifactGate({
      stage: "virtual_simulation",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result?.tag, USER_REVIEW_TAG);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
