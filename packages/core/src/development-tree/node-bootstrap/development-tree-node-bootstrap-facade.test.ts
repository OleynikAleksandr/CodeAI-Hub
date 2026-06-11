import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createDevelopmentTreeMaterializedRoot } from "../filesystem-structurator/development-tree-filesystem-paths";
import { DevelopmentTreeNodeBootstrapFacade } from "./development-tree-node-bootstrap-facade";

const MODULE_DRAFTS_FIRST_MESSAGE_PATTERN =
  /ModuleSpec\.draft\.md[\s\S]*ModuleFacadeContract\.draft\.md/;
const PRODUCT_PART_BRIEF_FIRST_MESSAGE_PATTERN = /ProductPartDevelopmentBrief/u;

const createModuleFolder = async (
  workspaceRoot: string,
  moduleId: string
): Promise<void> => {
  const root = createDevelopmentTreeMaterializedRoot({
    workspaceRoot,
    workspaceSlug: "demo-workspace",
  });
  await mkdir(
    path.join(
      root.absolutePath,
      "product-parts/local-runtime/modules",
      moduleId
    ),
    { recursive: true }
  );
};

const createProductPartFolder = async (
  workspaceRoot: string
): Promise<void> => {
  const root = createDevelopmentTreeMaterializedRoot({
    workspaceRoot,
    workspaceSlug: "demo-workspace",
  });
  await mkdir(path.join(root.absolutePath, "product-parts/local-runtime"), {
    recursive: true,
  });
};

test("DevelopmentTreeNodeBootstrapFacade consumes each materialized node once", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "node-bootstrap-")
  );
  try {
    await createModuleFolder(workspaceRoot, "provider-bridge");
    const facade = new DevelopmentTreeNodeBootstrapFacade();

    const first = await facade.consumeNewNodes({
      workspaceRoot,
      workspaceSlug: "demo-workspace",
    });
    const second = await facade.consumeNewNodes({
      workspaceRoot,
      workspaceSlug: "demo-workspace",
    });

    assert.deepEqual(
      first.newNodes.map((node) => `${node.kind}:${node.id}`),
      ["product_part:local-runtime", "module:provider-bridge"]
    );
    assert.equal(first.processedCount, 2);
    assert.deepEqual(second.newNodes, []);
    assert.equal(second.processedCount, 2);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("DevelopmentTreeNodeBootstrapFacade only returns newly added folders after first scan", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "node-bootstrap-")
  );
  try {
    await createModuleFolder(workspaceRoot, "provider-bridge");
    const facade = new DevelopmentTreeNodeBootstrapFacade();
    await facade.consumeNewNodes({
      workspaceRoot,
      workspaceSlug: "demo-workspace",
    });

    await createModuleFolder(workspaceRoot, "settings-store");
    const next = await facade.consumeNewNodes({
      workspaceRoot,
      workspaceSlug: "demo-workspace",
    });

    assert.deepEqual(
      next.newNodes.map((node) => `${node.kind}:${node.id}`),
      ["module:settings-store"]
    );
    assert.equal(next.processedCount, 3);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("DevelopmentTreeNodeBootstrapFacade restarts Product Part agent when plan and draft already exist", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "node-bootstrap-")
  );
  try {
    await createProductPartFolder(workspaceRoot);
    await new DevelopmentTreeNodeBootstrapFacade().consumeNewNodes({
      leadProductPartId: "local-runtime",
      productPartLeadershipOrder: ["local-runtime"],
      workspaceRoot,
      workspaceSlug: "demo-workspace",
      writeProductPartPlans: true,
    });

    const createdStages: string[] = [];
    const sentMessages: string[] = [];
    const result = await new DevelopmentTreeNodeBootstrapFacade({
      agentSessionOptions: {
        gateway: {
          createSessionForWorkflow: (options) => {
            createdStages.push(options.context.stage);
            return Promise.resolve({ id: `session-${createdStages.length}` });
          },
          handleMessage: (_sessionId, content) => {
            sentMessages.push(content);
            return Promise.resolve();
          },
        },
        providerId: "codex",
        workspacePath: workspaceRoot,
        workspaceSlug: "demo-workspace",
      },
    }).consumeNewNodes({
      leadProductPartId: "local-runtime",
      nodeKinds: ["product_part"],
      productPartLeadershipOrder: ["local-runtime"],
      workspaceRoot,
      workspaceSlug: "demo-workspace",
      writeProductPartPlans: true,
    });

    assert.notEqual(result.writtenDrafts[0]?.action, "created");
    assert.deepEqual(
      result.writtenProductPartPlans.map((plan) => plan.action),
      ["unchanged"]
    );
    assert.deepEqual(createdStages, [
      "development_tree/materialized/product-parts/local-runtime",
    ]);
    assert.match(
      sentMessages[0] ?? "",
      PRODUCT_PART_BRIEF_FIRST_MESSAGE_PATTERN
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("DevelopmentTreeNodeBootstrapFacade bootstraps agent sessions for new nodes when gateway is provided", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "node-bootstrap-")
  );
  try {
    await createModuleFolder(workspaceRoot, "provider-bridge");
    const createdStages: string[] = [];
    const sentMessages: string[] = [];
    const facade = new DevelopmentTreeNodeBootstrapFacade({
      agentSessionOptions: {
        gateway: {
          createSessionForWorkflow: (options) => {
            createdStages.push(options.context.stage);
            return Promise.resolve({ id: `session-${createdStages.length}` });
          },
          handleMessage: (_sessionId, content) => {
            sentMessages.push(content);
            return Promise.resolve();
          },
        },
        providerId: "codex",
        technologyBase: "TypeScript",
        workspacePath: workspaceRoot,
        workspaceSlug: "demo-workspace",
      },
    });

    const result = await facade.consumeNewNodes({
      workspaceRoot,
      workspaceSlug: "demo-workspace",
    });

    assert.deepEqual(
      result.agentSessions.map((session) => session.stage),
      [
        "development_tree/materialized/product-parts/local-runtime",
        "development_tree/materialized/product-parts/local-runtime/modules/provider-bridge",
      ]
    );
    assert.equal(createdStages.length, 2);
    assert.equal(sentMessages.length, 2);
    assert.match(sentMessages[1] ?? "", MODULE_DRAFTS_FIRST_MESSAGE_PATTERN);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
