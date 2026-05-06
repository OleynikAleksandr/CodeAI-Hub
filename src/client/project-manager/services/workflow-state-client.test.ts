import assert from "node:assert/strict";
import test from "node:test";
import { fetchWorkflowState } from "./workflow-state-client";

const installFetchStub = (payload: unknown): void => {
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: () =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(payload),
      }),
  });
};

const createWorkflowPayload = (
  developmentTree: unknown,
  continuity: unknown = { chains: [] },
  updatedAt = "2026-05-04T10:00:00.000Z"
): unknown => ({
  state: {
    workspaceSlug: "demo",
    updatedAt,
    stages: {},
  },
  continuity,
  developmentTree,
  gating: {
    blocked: {
      description: false,
      virtual_simulation: false,
      diagram_modules: false,
    },
  },
});

test("fetchWorkflowState parses optional development tree readiness", async () => {
  installFetchStub(
    createWorkflowPayload({
      parts: [
        {
          id: "ui-shell",
          readiness: "in_progress",
          status: "materialized",
          clusters: [
            {
              id: "layout",
              readiness: "ready",
              modules: [
                {
                  id: "main-area",
                  artifacts: [
                    {
                      fileName: "ModuleSpec.draft.md",
                      path: ".codeai-hub/demo/development_tree/materialized/product-parts/ui-shell/clusters/layout/modules/main-area/ModuleSpec.draft.md",
                    },
                  ],
                  readiness: "ready",
                  session: {
                    dialogId:
                      "codex-development-tree-ui-shell-layout-main-area",
                    providerId: "codexCli",
                    providerSessionId: "provider-session",
                    rootSessionId: "codex-root",
                    sessionId: "runtime-session",
                    updatedAt: "2026-05-04T10:01:00.000Z",
                  },
                  title: "Main Area",
                  workflowPath:
                    "development_tree/materialized/product-parts/ui-shell/clusters/layout/modules/main-area",
                },
              ],
            },
          ],
          standaloneModules: [
            {
              id: "theme-engine",
              readiness: "idle",
              title: "Theme Engine",
            },
          ],
        },
      ],
    },
    {
      chains: [
        {
          rootSessionId: "codex-root",
          workspaceSlug: "demo",
          stage:
            "development_tree/materialized/product-parts/ui-shell/clusters/layout/modules/main-area",
          updatedAt: "2026-05-04T10:01:00.000Z",
          segments: [
            {
              sessionId: "runtime-session",
              providerId: "codexCli",
              providerSessionId: "provider-session",
              createdAt: "2026-05-04T10:00:00.000Z",
            },
          ],
        },
      ],
    })
  );

  const state = await fetchWorkflowState({
    httpUrl: "http://127.0.0.1:8080",
    workspaceSlug: "demo",
  });

  const part = state?.developmentTree?.parts[0];
  assert.equal(part?.readiness, "in_progress");
  assert.equal(part?.clusters[0]?.readiness, "ready");
  const module = part?.clusters[0]?.modules[0];
  assert.equal(module?.readiness, "ready");
  assert.equal(
    module?.workflowPath,
    "development_tree/materialized/product-parts/ui-shell/clusters/layout/modules/main-area"
  );
  assert.equal(module?.artifacts?.[0]?.fileName, "ModuleSpec.draft.md");
  assert.equal(module?.session?.providerId, "codexCli");
  assert.equal(
    state?.continuity.chains[0]?.stage,
    "development_tree/materialized/product-parts/ui-shell/clusters/layout/modules/main-area"
  );
  assert.equal(part?.standaloneModules[0]?.readiness, "idle");
});

test("fetchWorkflowState preserves refreshed development tree metadata", async () => {
  installFetchStub(
    createWorkflowPayload(
      {
        parts: [
          {
            id: "project-manager",
            readiness: "ready",
            status: "materialized",
            artifacts: [
              {
                fileName: "PartDescription.draft.md",
                path: ".codeai-hub/demo/development_tree/materialized/product-parts/project-manager/PartDescription.draft.md",
              },
            ],
            clusters: [
              {
                id: "workflow-and-artifact-ui",
                readiness: "ready",
                artifacts: [
                  {
                    fileName: "ClusterDescription.draft.md",
                    path: ".codeai-hub/demo/development_tree/materialized/product-parts/project-manager/clusters/workflow-and-artifact-ui/ClusterDescription.draft.md",
                  },
                ],
                modules: [
                  {
                    id: "workflow-step-controller",
                    readiness: "ready",
                    title: "Workflow Step Controller",
                    artifacts: [
                      {
                        fileName: "ModuleSpec.draft.md",
                        path: ".codeai-hub/demo/development_tree/materialized/product-parts/project-manager/clusters/workflow-and-artifact-ui/modules/workflow-step-controller/ModuleSpec.draft.md",
                      },
                    ],
                    workflowPath:
                      "development_tree/materialized/product-parts/project-manager/clusters/workflow-and-artifact-ui/modules/workflow-step-controller",
                  },
                ],
                workflowPath:
                  "development_tree/materialized/product-parts/project-manager/clusters/workflow-and-artifact-ui",
              },
            ],
            standaloneModules: [],
            workflowPath:
              "development_tree/materialized/product-parts/project-manager",
          },
        ],
      },
      { chains: [] },
      "2026-05-05T10:30:00.000Z"
    )
  );

  const state = await fetchWorkflowState({
    httpUrl: "http://127.0.0.1:8080",
    workspaceSlug: "demo",
  });
  const part = state?.developmentTree?.parts[0];
  const cluster = part?.clusters[0];
  const module = cluster?.modules[0];

  assert.equal(state?.updatedAt, "2026-05-05T10:30:00.000Z");
  assert.equal(part?.readiness, "ready");
  assert.equal(part?.artifacts?.[0]?.fileName, "PartDescription.draft.md");
  assert.equal(cluster?.readiness, "ready");
  assert.equal(
    cluster?.artifacts?.[0]?.fileName,
    "ClusterDescription.draft.md"
  );
  assert.equal(module?.readiness, "ready");
  assert.equal(module?.artifacts?.[0]?.fileName, "ModuleSpec.draft.md");
  assert.equal(
    module?.workflowPath,
    "development_tree/materialized/product-parts/project-manager/clusters/workflow-and-artifact-ui/modules/workflow-step-controller"
  );
});

test("fetchWorkflowState preserves preview workflow paths without draft metadata", async () => {
  installFetchStub(
    createWorkflowPayload({
      parts: [
        {
          id: "ui-shell",
          status: "materialized",
          workflowPath: "development_tree/materialized/product-parts/ui-shell",
          clusters: [
            {
              id: "layout",
              workflowPath:
                "development_tree/materialized/product-parts/ui-shell/clusters/layout",
              modules: [
                {
                  id: "main-area",
                  title: "Main Area",
                  workflowPath:
                    "development_tree/materialized/product-parts/ui-shell/clusters/layout/modules/main-area",
                },
              ],
            },
          ],
          standaloneModules: [],
        },
      ],
    })
  );

  const state = await fetchWorkflowState({
    httpUrl: "http://127.0.0.1:8080",
    workspaceSlug: "demo",
  });
  const part = state?.developmentTree?.parts[0];
  const cluster = part?.clusters[0];
  const module = cluster?.modules[0];

  assert.equal(part?.workflowPath, "development_tree/materialized/product-parts/ui-shell");
  assert.equal(part?.artifacts, undefined);
  assert.equal(part?.session, undefined);
  assert.equal(
    cluster?.workflowPath,
    "development_tree/materialized/product-parts/ui-shell/clusters/layout"
  );
  assert.equal(module?.workflowPath?.endsWith("/modules/main-area"), true);
  assert.equal(module?.artifacts, undefined);
  assert.equal(module?.session, undefined);
});

test("fetchWorkflowState stays compatible when readiness is absent or invalid", async () => {
  installFetchStub(
    createWorkflowPayload({
      parts: [
        {
          id: "core",
          readiness: "blocked",
          status: "skeleton",
          clusters: [],
          standaloneModules: [{ id: "bridge", title: "Bridge" }],
        },
      ],
    })
  );

  const state = await fetchWorkflowState({
    httpUrl: "http://127.0.0.1:8080",
    workspaceSlug: "demo",
  });

  const part = state?.developmentTree?.parts[0];
  assert.equal(part?.readiness, undefined);
  assert.equal(part?.standaloneModules[0]?.readiness, undefined);
});
