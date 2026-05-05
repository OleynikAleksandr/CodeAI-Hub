import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { NodeAgentSessionBootstrapper } from "./node-agent-session-bootstrapper";

const RUSSIAN_RESPONSE_LANGUAGE_PATTERN =
  /User communication language: ru \(from Settings > General > Reasoning\)\./;

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
