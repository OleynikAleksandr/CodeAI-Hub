import assert from "node:assert/strict";
import test from "node:test";
import type {
  DescriptionBranchSnapshot,
  WorkflowStateSnapshot,
} from "../../services/workflow-state-client";
import {
  resolveDescriptionArtifact,
  resolveDescriptionSession,
} from "./description-workflow-state";

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
