import assert from "node:assert/strict";
import test from "node:test";
import { NodeAgentSessionBootstrapper } from "./node-agent-session-bootstrapper";

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
