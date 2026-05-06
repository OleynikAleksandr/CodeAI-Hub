import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { NodeAgentSessionBootstrapper } from "./node-agent-session-bootstrapper";

const RUSSIAN_RESPONSE_LANGUAGE_PATTERN =
  /User communication language: ru \(from Settings > General > Reasoning\)\./;
const ENGLISH_RESPONSE_LANGUAGE_PATTERN =
  /User communication language: en \(from Settings > General > Reasoning\)\./;
const RUSSIAN_ARTIFACT_LANGUAGE_PATTERN =
  /Target language code: ru \(from Settings > General > Artifacts for the User\)\./;
const RUSSIAN_DRAFT_ARTIFACT_RULE_PATTERN =
  /Write descriptive prose inside the draft artifacts in ru\./;
const FINAL_DESCRIPTION_CONTEXT_PATTERN =
  /Project Manager coordinates artifacts and sessions/;
const VIRTUAL_SIMULATION_CONTEXT_PATTERN =
  /The Artifact Workspace user reviews its working session/;
const DIAGRAM_MODULES_INDEX_CONTEXT_PATTERN =
  /project-manager owns the Project Manager product part/;
const PRODUCT_PART_CONTEXT_PATTERN =
  /Artifact Workspace belongs to Project Manager/;
const DETAILED_PRODUCT_PART_CONTEXT_PATTERN =
  /Detailed Project Manager decomposition is ready/;
const APPLICATION_SKELETON_MAP_CONTEXT_PATTERN =
  /"moduleId":"artifact-workspace"/;
const QUALITY_GATES_CONTEXT_PATTERN = /"build":"npm run build:webview"/;
const CORE_RUNTIME_CONTEXT_PATTERN = /Core Runtime manages provider processes/;
const WORKFLOW_STEP_CONTEXT_PATTERN =
  /Workflow Step Navigation chooses current step/;

const writeWorkspaceArtifact = async (
  workspacePath: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspacePath, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

test("NodeAgentSessionBootstrapper uses materialized node path as workflow stage", async () => {
  const createdStages: string[] = [];
  const result = await new NodeAgentSessionBootstrapper().bootstrapNode(
    {
      absolutePath:
        "/workspace/.codeai-hub/demo-workspace/development_tree/materialized/product-parts/project-manager/clusters/workflow-and-artifact-ui/modules/workflow-step-controller",
      clusterId: "workflow-and-artifact-ui",
      id: "workflow-step-controller",
      kind: "module",
      partId: "project-manager",
      relativePath:
        ".codeai-hub/demo-workspace/development_tree/materialized/product-parts/project-manager/clusters/workflow-and-artifact-ui/modules/workflow-step-controller",
    },
    {
      gateway: {
        createSessionForWorkflow: (options) => {
          createdStages.push(options.context.stage);
          return Promise.resolve({ id: "session-1" });
        },
        handleMessage: () => Promise.resolve(),
      },
      providerId: "codexCli",
      technologyBase: "TypeScript",
      workspacePath: "/workspace",
      workspaceSlug: "demo-workspace",
    }
  );

  const expectedStage =
    "development_tree/materialized/product-parts/project-manager/clusters/workflow-and-artifact-ui/modules/workflow-step-controller";
  assert.equal(result.stage, expectedStage);
  assert.deepEqual(createdStages, [expectedStage]);
});

test("NodeAgentSessionBootstrapper reads response language from settings reasoning category", async () => {
  const settingsDir = await mkdtemp(
    path.join(os.tmpdir(), "node-agent-settings-")
  );
  const settingsPath = path.join(settingsDir, "settings.json");
  const previousSettingsPath = process.env.CLAUDE_SETTINGS_PATH;
  const sentMessages: string[] = [];
  try {
    process.env.CLAUDE_SETTINGS_PATH = settingsPath;
    await writeFile(
      settingsPath,
      `${JSON.stringify({
        general: {
          localization: {
            categories: { reasoning: "ru" },
            defaultLanguage: "en",
          },
        },
      })}\n`,
      "utf8"
    );

    await new NodeAgentSessionBootstrapper().bootstrapNode(
      {
        absolutePath:
          "/workspace/.codeai-hub/demo-workspace/development_tree/materialized/product-parts/project-manager/modules/desktop-launcher-claude",
        id: "desktop-launcher-claude",
        kind: "module",
        partId: "project-manager",
        relativePath:
          ".codeai-hub/demo-workspace/development_tree/materialized/product-parts/project-manager/modules/desktop-launcher-claude",
      },
      {
        gateway: {
          createSessionForWorkflow: () => Promise.resolve({ id: "session-1" }),
          handleMessage: (_sessionId, content) => {
            sentMessages.push(content);
            return Promise.resolve();
          },
        },
        providerId: "codexCli",
        workspacePath: "/workspace",
        workspaceSlug: "demo-workspace",
      }
    );

    assert.match(sentMessages[0] ?? "", RUSSIAN_RESPONSE_LANGUAGE_PATTERN);
  } finally {
    if (previousSettingsPath === undefined) {
      process.env.CLAUDE_SETTINGS_PATH = undefined;
    } else {
      process.env.CLAUDE_SETTINGS_PATH = previousSettingsPath;
    }
    await rm(settingsDir, { recursive: true, force: true });
  }
});

test("NodeAgentSessionBootstrapper reads draft artifact language from settings artifacts category", async () => {
  const settingsDir = await mkdtemp(
    path.join(os.tmpdir(), "node-agent-artifact-settings-")
  );
  const settingsPath = path.join(settingsDir, "settings.json");
  const previousSettingsPath = process.env.CLAUDE_SETTINGS_PATH;
  const sentMessages: string[] = [];
  try {
    process.env.CLAUDE_SETTINGS_PATH = settingsPath;
    await writeFile(
      settingsPath,
      `${JSON.stringify({
        general: {
          localization: {
            categories: {
              artifactsForTheUser: "ru",
              reasoning: "en",
            },
            defaultLanguage: "en",
          },
        },
      })}\n`,
      "utf8"
    );

    await new NodeAgentSessionBootstrapper().bootstrapNode(
      {
        absolutePath:
          "/workspace/.codeai-hub/demo-workspace/development_tree/materialized/product-parts/project-manager/clusters/workflow-artifact-ui",
        clusterId: "workflow-artifact-ui",
        id: "workflow-artifact-ui",
        kind: "cluster",
        partId: "project-manager",
        relativePath:
          ".codeai-hub/demo-workspace/development_tree/materialized/product-parts/project-manager/clusters/workflow-artifact-ui",
      },
      {
        gateway: {
          createSessionForWorkflow: () => Promise.resolve({ id: "session-1" }),
          handleMessage: (_sessionId, content) => {
            sentMessages.push(content);
            return Promise.resolve();
          },
        },
        providerId: "codexCli",
        workspacePath: "/workspace",
        workspaceSlug: "demo-workspace",
      }
    );

    const firstMessage = sentMessages[0] ?? "";
    assert.match(firstMessage, ENGLISH_RESPONSE_LANGUAGE_PATTERN);
    assert.match(firstMessage, RUSSIAN_ARTIFACT_LANGUAGE_PATTERN);
    assert.match(firstMessage, RUSSIAN_DRAFT_ARTIFACT_RULE_PATTERN);
  } finally {
    if (previousSettingsPath === undefined) {
      process.env.CLAUDE_SETTINGS_PATH = undefined;
    } else {
      process.env.CLAUDE_SETTINGS_PATH = previousSettingsPath;
    }
    await rm(settingsDir, { recursive: true, force: true });
  }
});

test("NodeAgentSessionBootstrapper sends scoped workflow artifacts in the first prompt", async () => {
  const workspacePath = await mkdtemp(
    path.join(os.tmpdir(), "node-agent-workspace-")
  );
  const workspaceSlug = "demo-workspace";
  const sentMessages: string[] = [];
  try {
    await writeWorkspaceArtifact(
      workspacePath,
      `.codeai-hub/${workspaceSlug}/description/Final_Description.md`,
      [
        "## Project Manager",
        "Project Manager coordinates artifacts and sessions.",
        "## Core Runtime",
        "Core Runtime manages provider processes.",
      ].join("\n")
    );
    await writeWorkspaceArtifact(
      workspacePath,
      `.codeai-hub/${workspaceSlug}/virtual_simulation/virtual-simulation.md`,
      [
        "## Artifact Workspace",
        "The Artifact Workspace user reviews its working session.",
        "## Provider Console",
        "The provider console streams runtime output.",
      ].join("\n")
    );
    await writeWorkspaceArtifact(
      workspacePath,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`,
      [
        "Product Part: project-manager",
        "project-manager owns the Project Manager product part.",
        "Product Part: core-runtime",
        "core-runtime owns the Core Runtime product part.",
      ].join("\n")
    );
    await writeWorkspaceArtifact(
      workspacePath,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts/project-manager.md`,
      [
        "Product Part: project-manager",
        "Cluster: workflow-artifact-ui",
        "Module: artifact-workspace",
        "Artifact Workspace belongs to Project Manager.",
        "Module: workflow-step-navigation",
        "Workflow Step Navigation chooses current step.",
      ].join("\n")
    );
    await writeWorkspaceArtifact(
      workspacePath,
      `.codeai-hub/${workspaceSlug}/application_skeleton/application-skeleton-map.json`,
      JSON.stringify({ mappings: [{ moduleId: "artifact-workspace" }] })
    );
    await writeWorkspaceArtifact(
      workspacePath,
      `.codeai-hub/${workspaceSlug}/quality_gates/quality-gates.json`,
      JSON.stringify({ commands: { build: "npm run build:webview" } })
    );

    await new NodeAgentSessionBootstrapper().bootstrapNode(
      {
        absolutePath: path.join(
          workspacePath,
          `.codeai-hub/${workspaceSlug}/development_tree/materialized/product-parts/project-manager/modules/artifact-workspace`
        ),
        id: "artifact-workspace",
        kind: "module",
        partId: "project-manager",
        relativePath: `.codeai-hub/${workspaceSlug}/development_tree/materialized/product-parts/project-manager/modules/artifact-workspace`,
      },
      {
        gateway: {
          createSessionForWorkflow: () => Promise.resolve({ id: "session-1" }),
          handleMessage: (_sessionId, content) => {
            sentMessages.push(content);
            return Promise.resolve();
          },
        },
        providerId: "codexCli",
        technologyBase: "TypeScript",
        workspacePath,
        workspaceSlug,
      }
    );

    const firstMessage = sentMessages[0] ?? "";
    assert.match(firstMessage, FINAL_DESCRIPTION_CONTEXT_PATTERN);
    assert.match(firstMessage, VIRTUAL_SIMULATION_CONTEXT_PATTERN);
    assert.match(firstMessage, DIAGRAM_MODULES_INDEX_CONTEXT_PATTERN);
    assert.match(firstMessage, PRODUCT_PART_CONTEXT_PATTERN);
    assert.match(firstMessage, APPLICATION_SKELETON_MAP_CONTEXT_PATTERN);
    assert.match(firstMessage, QUALITY_GATES_CONTEXT_PATTERN);
    assert.doesNotMatch(firstMessage, CORE_RUNTIME_CONTEXT_PATTERN);
    assert.doesNotMatch(firstMessage, WORKFLOW_STEP_CONTEXT_PATTERN);
  } finally {
    await rm(workspacePath, { recursive: true, force: true });
  }
});

test("NodeAgentSessionBootstrapper waits briefly for detailed product part context", async () => {
  const workspacePath = await mkdtemp(
    path.join(os.tmpdir(), "node-agent-delayed-part-")
  );
  const workspaceSlug = "demo-workspace";
  const sentMessages: string[] = [];
  try {
    await writeWorkspaceArtifact(
      workspacePath,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`,
      [
        "Product Part: project-manager",
        "project-manager owns the Project Manager product part.",
      ].join("\n")
    );

    const delayedPartContext = new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        writeWorkspaceArtifact(
          workspacePath,
          `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts/project-manager.md`,
          [
            "# Product Part: Project Manager",
            "Detailed Project Manager decomposition is ready.",
            "## Owned Clusters",
            "Cluster: workflow-and-artifact-ui",
          ].join("\n")
        ).then(resolve, reject);
      }, 50);
    });

    await new NodeAgentSessionBootstrapper().bootstrapNode(
      {
        absolutePath: path.join(
          workspacePath,
          `.codeai-hub/${workspaceSlug}/development_tree/materialized/product-parts/project-manager`
        ),
        id: "project-manager",
        kind: "product_part",
        partId: "project-manager",
        relativePath: `.codeai-hub/${workspaceSlug}/development_tree/materialized/product-parts/project-manager`,
      },
      {
        gateway: {
          createSessionForWorkflow: () => Promise.resolve({ id: "session-1" }),
          handleMessage: (_sessionId, content) => {
            sentMessages.push(content);
            return Promise.resolve();
          },
        },
        providerId: "codexCli",
        workspacePath,
        workspaceSlug,
      }
    );
    await delayedPartContext;

    const firstMessage = sentMessages[0] ?? "";
    assert.match(firstMessage, DIAGRAM_MODULES_INDEX_CONTEXT_PATTERN);
    assert.match(firstMessage, DETAILED_PRODUCT_PART_CONTEXT_PATTERN);
  } finally {
    await rm(workspacePath, { recursive: true, force: true });
  }
});
