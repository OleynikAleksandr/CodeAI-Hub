import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import type {
  DescriptionBranchSnapshot,
  WorkflowStateSnapshot,
} from "../../services/workflow-state-client";
import {
  resolveDescriptionArtifact,
  resolveDescriptionSession,
} from "./description-workflow-state";

const MAIN_AREA_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/main-area.tsx"
);

const WORKSPACE_TREE_AUTO_SELECT_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/workspace-tree-auto-select.ts"
);

const createWorkflowState = (
  description: DescriptionBranchSnapshot | null
): WorkflowStateSnapshot => ({
  workspaceSlug: "workspace-lock",
  updatedAt: "2026-03-12T10:00:00.000Z",
  stages: {
    description: "completed",
    virtual_simulation: "idle",
    diagram_modules: "idle",
    diagram_facades: "idle",
  },
  continuity: { chains: [] },
  description,
  executionProfile: null,
  gating: {
    blocked: {
      description: false,
      virtual_simulation: false,
      diagram_modules: false,
      diagram_facades: false,
    },
  },
});

test("resolveDescriptionSession prefers collector session over legacy session slot", () => {
  const state = createWorkflowState({
    updatedAt: "2026-03-12T10:00:00.000Z",
    collectorSession: {
      providerId: "codexCli",
      providerSessionId: "collector-provider-session",
      jsonlPath: "/tmp/workspace-lock/collector.jsonl",
    },
    session: {
      providerId: "claudeCodeCli",
      providerSessionId: "legacy-provider-session",
      jsonlPath: "/tmp/workspace-lock/legacy.jsonl",
    },
    sessionKind: "collector",
  });

  const session = resolveDescriptionSession(state);

  assert.equal(session?.providerId, "codexCli");
  assert.equal(session?.providerSessionId, "collector-provider-session");
});

test("resolveDescriptionArtifact falls back to canonical questionnaire path", () => {
  const artifact = resolveDescriptionArtifact(
    { updatedAt: "2026-03-12T10:00:00.000Z" },
    "workspace-lock"
  );

  assert.deepEqual(artifact, {
    path: ".codeai-hub/workspace-lock/description/questionnaire.md",
    label: "questionnaire.md",
  });
});

test("resolveDescriptionArtifact prefers final artifact over draft and questionnaire", () => {
  const artifact = resolveDescriptionArtifact(
    {
      updatedAt: "2026-03-12T10:00:00.000Z",
      questionnairePath: ".codeai-hub/workspace-lock/description/questionnaire.md",
      draftPath: ".codeai-hub/workspace-lock/description/description.md",
      finalPath: ".codeai-hub/workspace-lock/description/Final_Description.md",
    },
    "workspace-lock"
  );

  assert.deepEqual(artifact, {
    path: ".codeai-hub/workspace-lock/description/Final_Description.md",
    label: "Final_Description.md",
  });
});

test("pm description consumers preserve session state through the shared resolver", async () => {
  const [mainAreaSource, workspaceTreeAutoSelectSource] = await Promise.all([
    readFile(MAIN_AREA_PATH, "utf8"),
    readFile(WORKSPACE_TREE_AUTO_SELECT_PATH, "utf8"),
  ]);

  assert.equal(
    mainAreaSource.includes("setHasDescriptionSession: (value) => {"),
    true
  );
  assert.equal(
    mainAreaSource.includes("setHasDescriptionSession(true);"),
    true
  );
  assert.equal(
    workspaceTreeAutoSelectSource.includes(
      'import { resolveDescriptionSession } from "./description-workflow-state";'
    ),
    true
  );
  assert.equal(
    workspaceTreeAutoSelectSource.includes(
      "const descriptionSession = resolveDescriptionSession(state);"
    ),
    true
  );
});
