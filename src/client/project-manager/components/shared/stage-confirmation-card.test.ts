import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import type { ProviderStackDescriptor } from "../../../../types/provider";
import type { WorkflowStateSnapshot } from "../../services/workflow-state-client";
import {
  isResearchCapableProviderId,
  resolvePreferredWorkflowProviderId,
} from "../../services/workflow-provider-resolver";
import { resolveStageSyncPayload } from "../layout/workspace-tree-branch-nodes";
import {
  resolveDisplayedArtifactName,
  resolveInheritedStageProviderId,
  resolveStageSessionIntent,
} from "./stage-confirmation-card-workflow";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/shared/stage-confirmation-card.tsx"
);
const WORKFLOW_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/shared/stage-confirmation-card-workflow.ts"
);
const DEVELOPMENT_TREE_NODE_START_CARD_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/development-tree-node-start-card.tsx"
);

test("stage confirmation card keeps explicit provider override in start path", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(source.includes("const [selectedProviderId, setSelectedProviderId] ="), true);
  assert.equal(source.includes("resolvePreferredWorkflowProviderId({"), true);
  assert.equal(source.includes("providerId: selectedProviderId,"), true);
  assert.equal(source.includes("modelId: selectedModelId,"), true);
  assert.equal(source.includes("reasoning: selectedReasoning,"), true);
  assert.equal(source.includes("startService.startVirtualSimulation("), true);
  assert.equal(source.includes("startService.startDiagramModules("), true);
  assert.equal(source.includes("startService.startApplicationSkeleton("), true);
  assert.equal(source.includes("startService.startQualityGates("), true);
});

test("stage confirmation card exposes model and reasoning controls", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(source.includes("getStartCardModelOptions("), true);
  assert.equal(source.includes("getStartCardReasoningOptions("), true);
  assert.equal(source.includes("CaptureWorkbenchDomListboxSelector"), true);
  assert.equal(source.includes('"pm.confirmation_card.model_label"'), true);
  assert.equal(source.includes('"pm.confirmation_card.reasoning_label"'), true);
  assert.equal(source.includes("<select"), false);
});

test("quality gates start card hides providers without research tooling", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(source.includes("isResearchCapableProviderId"), true);
  assert.equal(source.includes('stage !== "quality_gates"'), true);
});

test("quality gates provider resolver keeps OpenRouter after tool enablement", () => {
  const providers: readonly ProviderStackDescriptor[] = [
    {
      connected: true,
      description: "Gemini CLI",
      id: "geminiCli",
      title: "Gemini",
    },
    {
      connected: true,
      description: "OpenRouter",
      id: "openRouter",
      title: "OpenRouter",
    },
  ];
  const snapshot: WorkflowStateSnapshot = {
    ...buildWorkflowSnapshot(),
    description: {
      finalPath:
        ".codeai-hub/codeai-hub-codex-5-4/description/Final_Description.md",
      primarySession: {
        jsonlPath:
          ".codeai-hub/codeai-hub-codex-5-4/sessions/openrouter.jsonl",
        providerId: "openRouter",
        providerSessionId: "openrouter-description",
      },
      updatedAt: "2026-05-24T06:10:00.000Z",
    },
  };

  assert.equal(isResearchCapableProviderId("openRouter"), true);
  assert.equal(
    resolvePreferredWorkflowProviderId({
      providers,
      stage: "quality_gates",
      workflowState: snapshot,
    }),
    "openRouter"
  );
});

test("development tree node start card avoids native selects", async () => {
  const source = await readFile(DEVELOPMENT_TREE_NODE_START_CARD_SOURCE_PATH, "utf8");

  assert.equal(source.includes("CaptureWorkbenchDomListboxSelector"), true);
  assert.equal(source.includes("applyStartCardModelDefaults("), true);
  assert.equal(source.includes("saveWorkflowSettingsAndWait("), true);
  assert.equal(source.includes("api.startDevelopmentTreeNode({"), true);
  const startPayloadIndex = source.indexOf("api.startDevelopmentTreeNode({");
  const startPayloadEndIndex = source.indexOf("});", startPayloadIndex);
  const startPayload = source.slice(startPayloadIndex, startPayloadEndIndex);
  assert.equal(startPayload.includes("modelId"), false);
  assert.equal(startPayload.includes("reasoning"), false);
  assert.equal(source.includes("<select"), false);
});

test("stage confirmation card keeps previous-step badge and override helper copy", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(
    source.includes('"pm.confirmation_card.previous_provider_badge"'),
    true
  );
  assert.equal(
    source.includes('"pm.confirmation_card.selected_provider_hint"'),
    true
  );
  assert.equal(
    source.includes('"pm.confirmation_card.selected_provider_override_hint"'),
    true
  );
  assert.equal(source.includes("isUsingInheritedProvider"), true);
});

test("stage confirmation card hides managed workflow preview details", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(source.includes("managedPreviewStage"), true);
  assert.equal(
    source.includes('"pm.confirmation_card.managed_preview_title"'),
    false
  );
  assert.equal(source.includes("Managed Workflow Orchestration preview"), false);
  assert.equal(source.includes("Accept contract"), false);
});

test("stage model listbox keeps model labels on one line", async () => {
  const source = await readFile(
    path.resolve(
      process.cwd(),
      "src/client/project-manager/components/capture-workbench/dom-listbox-selector.tsx"
    ),
    "utf8"
  );

  assert.equal(source.includes('minWidth: "max(100%, 220px)"'), true);
  assert.equal(source.includes('width: "max-content"'), true);
  assert.equal(source.includes('whiteSpace: "nowrap"'), true);
});

test("stage confirmation workflow includes technical root stage labels", async () => {
  const source = await readFile(WORKFLOW_SOURCE_PATH, "utf8");

  assert.equal(source.includes('application_skeleton: "Application Skeleton"'), true);
  assert.equal(source.includes('quality_gates: "Quality Gates Baseline"'), true);
  assert.equal(
    source.includes('quality_gates: "materialized Application Skeleton"'),
    true
  );
  assert.equal(source.includes('application_skeleton: "product-parts.index.md"'), true);
  assert.equal(source.includes('quality_gates: "application-skeleton-map.json"'), true);
});

test("stage confirmation card labels dirty workspace cleanup separately from artifacts", () => {
  assert.equal(
    resolveDisplayedArtifactName(
      { available: false, fileName: "application-skeleton-map.json" },
      true
    ),
    "workspace changes"
  );
  assert.equal(
    resolveDisplayedArtifactName(
      { available: false, fileName: "application-skeleton-map.json" },
      false
    ),
    "application-skeleton-map.json"
  );
});

const buildWorkflowSnapshot = (): WorkflowStateSnapshot => ({
  workspaceSlug: "codeai-hub-codex-5-4",
  updatedAt: "2026-05-24T06:00:00.000Z",
  stages: {
    description: "completed",
    virtual_simulation: "idle",
    diagram_modules: "idle",
    application_skeleton: "idle",
    quality_gates: "idle",
  },
  continuity: {
    chains: [
      {
        rootSessionId: "codex-description-root",
        workspaceSlug: "codeai-hub-codex-5-4",
        stage: "description",
        updatedAt: "2026-05-24T06:10:00.000Z",
        segments: [
          {
            sessionId: "codex-description-root",
            providerId: "codexCli",
            providerSessionId: "codex-native-description",
            createdAt: "2026-05-24T06:00:00.000Z",
          },
        ],
      },
    ],
  },
  lastActive: null,
  description: {
    updatedAt: "2026-05-24T06:10:00.000Z",
    finalPath: ".codeai-hub/codeai-hub-codex-5-4/description/Final_Description.md",
  },
  gating: {
    blocked: {
      description: false,
      virtual_simulation: false,
      diagram_modules: true,
      application_skeleton: true,
      quality_gates: true,
    },
  },
});

test("virtual simulation inherits Description provider from continuity", () => {
  const snapshot = buildWorkflowSnapshot();

  assert.equal(resolveInheritedStageProviderId("virtual_simulation", snapshot), "codexCli");
});

test("description session intent falls back to Description continuity", () => {
  const snapshot = buildWorkflowSnapshot();

  assert.deepEqual(
    resolveStageSessionIntent(
      "description",
      snapshot,
      "/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4",
      "codeai-hub-codex-5-4"
    ),
    {
      providerId: "codexCli",
      providerSessionId: "codex-native-description",
      workspacePath: "/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4",
      workspaceSlug: "codeai-hub-codex-5-4",
      initiativeSlug: "codeai-hub-codex-5-4",
      stage: "description",
      sessionKind: "collector",
      runSlug: null,
    }
  );
});

test("description tree sync falls back to Description continuity", () => {
  const snapshot = buildWorkflowSnapshot();

  const payload = resolveStageSyncPayload({
    stage: "description",
    workflowState: snapshot,
    workspaceSlug: "codeai-hub-codex-5-4",
    workspacePath: "/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4",
    virtualSimulationArtifactAvailable: false,
  });

  assert.deepEqual(payload.session, {
    providerId: "codexCli",
    providerSessionId: "codex-native-description",
    workspacePath: "/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4",
    workspaceSlug: "codeai-hub-codex-5-4",
    initiativeSlug: "codeai-hub-codex-5-4",
    stage: "description",
    sessionKind: "collector",
    runSlug: null,
  });
  assert.deepEqual(payload.artifact, {
    path: ".codeai-hub/codeai-hub-codex-5-4/description/Final_Description.md",
    label: "Final_Description.md",
  });
});
