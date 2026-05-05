import assert from "node:assert/strict";
import test from "node:test";
import { Logger } from "../../telemetry/logger";
import type { UnifiedSessionStorage } from "../../unified-session/storage";
import { SessionRequestHandlerContinuityRoot } from "./session-request-handler-continuity-root";

const DEVELOPMENT_TREE_SUFFIX_RE =
  /^codex-7846f548-72ec-4a72-a9f5-d27ef3c019bb-project-manager-workflow-and-artifact-ui-workflow-step-controller$/;
const GENERIC_DEVELOPMENT_TREE_SUFFIX_RE = /development-tree$/;

const createContinuityRoot = (): SessionRequestHandlerContinuityRoot =>
  new SessionRequestHandlerContinuityRoot({
    logger: new Logger("error"),
    sessionStorage: {} as UnifiedSessionStorage,
  });

test("development tree root ids use node path suffix instead of generic run slug", async () => {
  const rootSessionId =
    await createContinuityRoot().resolveContinuityRootSessionId({
      providerId: "codexCli",
      rootSessionIdOverride: null,
      sessionId: "7846f548-72ec-4a72-a9f5-d27ef3c019bb",
      workspaceRoot: "/workspace",
      context: {
        initiativeSlug: "demo-workspace",
        providerSessionId: null,
        runSlug: "development-tree",
        stage:
          "development_tree/materialized/product-parts/project-manager/clusters/workflow-and-artifact-ui/modules/workflow-step-controller",
      },
    });

  assert.match(rootSessionId, DEVELOPMENT_TREE_SUFFIX_RE);
  assert.doesNotMatch(rootSessionId, GENERIC_DEVELOPMENT_TREE_SUFFIX_RE);
});
