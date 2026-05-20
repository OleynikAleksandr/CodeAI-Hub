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
  updatedAt = "2026-05-04T10:00:00.000Z",
  extra: Record<string, unknown> = {}
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
      application_skeleton: false,
      quality_gates: false,
    },
  },
  ...extra,
});

test("fetchWorkflowState parses optional development tree readiness", async () => {
  installFetchStub(
    createWorkflowPayload({
      parts: [
        {
          id: "ui-shell",
          artifactWorkspacePath:
            ".codeai-hub/demo/development_tree/materialized/product-parts/ui-shell",
          codeWorkspacePath: "product-parts/ui-shell",
          readiness: "in_progress",
          status: "materialized",
          clusters: [
            {
              id: "layout",
              artifactWorkspacePath:
                ".codeai-hub/demo/development_tree/materialized/product-parts/ui-shell/clusters/layout",
              codeWorkspacePath: "product-parts/ui-shell/clusters/layout",
              readiness: "ready",
              modules: [
                {
                  id: "main-area",
                  artifactWorkspacePath:
                    ".codeai-hub/demo/development_tree/materialized/product-parts/ui-shell/clusters/layout/modules/main-area",
                  codeWorkspacePath:
                    "product-parts/ui-shell/clusters/layout/modules/main-area",
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
                  operations: [
                    {
                      id: "module-facade-specification",
                      kind: "module_facade_specification",
                      title: "Module / Facade Specification",
                      workflowPath:
                        "development_tree/materialized/product-parts/ui-shell/clusters/layout/modules/main-area",
                      artifactWorkspacePath:
                        ".codeai-hub/demo/development_tree/materialized/product-parts/ui-shell/clusters/layout/modules/main-area",
                    },
                    {
                      id: "implementation",
                      kind: "implementation",
                      title: "Implementation",
                      workflowPath:
                        "development_tree/materialized/product-parts/ui-shell/clusters/layout/modules/main-area/implementation",
                      artifactWorkspacePath:
                        ".codeai-hub/demo/development_tree/materialized/product-parts/ui-shell/clusters/layout/modules/main-area",
                      children: [
                        {
                          id: "workers",
                          kind: "workers",
                          title: "Workers",
                          workflowPath:
                            "development_tree/materialized/product-parts/ui-shell/clusters/layout/modules/main-area/workers",
                          artifactWorkspacePath:
                            ".codeai-hub/demo/development_tree/materialized/product-parts/ui-shell/clusters/layout/modules/main-area/workers",
                        },
                      ],
                    },
                  ],
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
  assert.equal(part?.codeWorkspacePath, "product-parts/ui-shell");
  assert.equal(part?.clusters[0]?.readiness, "ready");
  assert.equal(
    part?.clusters[0]?.artifactWorkspacePath,
    ".codeai-hub/demo/development_tree/materialized/product-parts/ui-shell/clusters/layout"
  );
  const module = part?.clusters[0]?.modules[0];
  assert.equal(module?.readiness, "ready");
  assert.equal(
    module?.codeWorkspacePath,
    "product-parts/ui-shell/clusters/layout/modules/main-area"
  );
  assert.equal(
    module?.workflowPath,
    "development_tree/materialized/product-parts/ui-shell/clusters/layout/modules/main-area"
  );
  assert.equal(module?.operations?.[0]?.kind, "module_facade_specification");
  assert.equal(module?.operations?.[1]?.children?.[0]?.kind, "workers");
  assert.equal(
    module?.operations?.[1]?.children?.[0]?.artifactWorkspacePath,
    ".codeai-hub/demo/development_tree/materialized/product-parts/ui-shell/clusters/layout/modules/main-area/workers"
  );
  assert.equal(module?.artifacts?.[0]?.fileName, "ModuleSpec.draft.md");
  assert.equal(module?.session?.providerId, "codexCli");
  assert.equal(
    state?.continuity.chains[0]?.stage,
    "development_tree/materialized/product-parts/ui-shell/clusters/layout/modules/main-area"
  );
  assert.equal(part?.standaloneModules[0]?.readiness, "idle");
});

test("fetchWorkflowState preserves managed orchestration read-only projection", async () => {
  installFetchStub(
    createWorkflowPayload(null, { chains: [] }, "2026-05-04T10:00:00.000Z", {
      managedWorkflowPreview: {
        active: true,
        mode: "preview",
        readOnlyStages: ["description"],
        reason: "Managed Workflow Orchestration cluster is active.",
        stages: [
          {
            controllerId: "description",
            displayName: "Description",
            phaseTypes: ["provider_direct"],
            startPolicy: "provider_direct",
          },
          {
            currentPhase: { index: 1, title: "Core-Gated Draft", type: "core_gated" },
            controllerId: "diagram_modules",
            displayName: "Diagram Modules",
            phaseTypes: ["core_gated"],
            runStatus: "core_gated",
            startPolicy: "managed_dispatch",
          },
          {
            controllerId: "application_skeleton",
            displayName: "Application Skeleton",
            phaseTypes: ["core_gated"],
            startPolicy: "managed_dispatch",
          },
          {
            controllerId: "quality_gates",
            displayName: "Quality Gates Baseline",
            phaseTypes: ["core_gated"],
            startPolicy: "managed_dispatch",
          },
        ],
      },
    })
  );

  const state = await fetchWorkflowState({
    httpUrl: "http://127.0.0.1:8080",
    workspaceSlug: "demo",
  });

  assert.deepEqual(state?.managedWorkflowPreview?.readOnlyStages, [
    "description",
  ]);
  assert.equal(
    state?.managedWorkflowPreview?.stages[0]?.startPolicy,
    "provider_direct"
  );
  assert.equal(
    state?.managedWorkflowPreview?.stages[1]?.startPolicy,
    "managed_dispatch"
  );
  assert.equal(
    state?.managedWorkflowPreview?.stages[1]?.runStatus,
    "core_gated"
  );
  assert.equal(
    state?.managedWorkflowPreview?.stages[1]?.currentPhase?.type,
    "core_gated"
  );
  assert.equal(
    state?.managedWorkflowPreview?.stages[2]?.startPolicy,
    "managed_dispatch"
  );
  assert.equal(
    state?.managedWorkflowPreview?.stages[3]?.startPolicy,
    "managed_dispatch"
  );
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
