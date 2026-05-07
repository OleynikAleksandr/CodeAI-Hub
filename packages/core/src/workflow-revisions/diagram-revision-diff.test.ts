import assert from "node:assert/strict";
import test from "node:test";
import type { ModuleMapModel } from "../workflow/diagram-dsl/diagram-dsl-types";
import { diffDiagramModuleRevisions } from "./diagram-revision-diff";

const BASELINE_CONTROL_CLUSTER = {
  id: "control",
  moduleIds: ["planner"],
  productPart: "shell",
  purpose: "Coordinate user work",
  title: "Control",
} as const;

const BASELINE: ModuleMapModel = {
  clusters: [BASELINE_CONTROL_CLUSTER],
  modules: [
    {
      id: "planner",
      cluster: "control",
      codeTargets: ["product-parts/shell/clusters/control/modules/planner"],
      contractTargets: ["contracts/planner.md"],
      inputs: ["user-request"],
      origin: "agent",
      outputs: ["plan"],
      responsibility: "Build execution plans",
      status: "accepted",
      title: "Planner",
    },
    {
      id: "legacy-export",
      codeTargets: [],
      contractTargets: [],
      inputs: [],
      origin: "agent",
      outputs: [],
      productPart: "shell",
      responsibility: "Export legacy reports",
      status: "proposed",
      title: "Legacy Export",
    },
  ],
  productParts: [
    {
      clusterIds: ["control"],
      id: "shell",
      purpose: "User-facing product shell",
      standaloneModuleIds: ["legacy-export"],
      title: "Shell",
    },
  ],
  relations: [],
  revision: "base",
  stage: "diagram_modules",
  updated: "2026-05-07T00:00:00.000Z",
  version: 1,
};

test("diffDiagramModuleRevisions classifies changed added removed and renamed entities", () => {
  const current: ModuleMapModel = {
    ...BASELINE,
    clusters: [
      {
        ...BASELINE_CONTROL_CLUSTER,
        purpose: "Coordinate user work and recovery",
      },
    ],
    modules: [
      {
        ...BASELINE.modules[0],
        title: "Planning Coordinator",
      },
      {
        codeTargets: [],
        contractTargets: [],
        id: "audit-log",
        inputs: ["event"],
        origin: "user",
        outputs: ["record"],
        productPart: "shell",
        responsibility: "Record auditable events",
        status: "proposed",
        title: "Audit Log",
      },
      {
        codeTargets: [],
        contractTargets: [],
        id: "legacy-report-export",
        inputs: [],
        origin: "agent",
        outputs: [],
        productPart: "shell",
        responsibility: "Export legacy reports",
        status: "proposed",
        title: "Legacy Report Export",
      },
    ],
    productParts: [
      {
        clusterIds: ["control"],
        id: "shell",
        purpose: "User-facing product shell",
        standaloneModuleIds: ["legacy-report-export", "audit-log"],
        title: "Shell",
      },
    ],
    revision: "current",
  };

  const diff = diffDiagramModuleRevisions(BASELINE, current);

  assert.equal(diff.baselineRevision, "base");
  assert.equal(diff.currentRevision, "current");
  assert.deepEqual(
    diff.changes.map((change) => [
      change.kind,
      change.action,
      change.fromId ?? change.id,
      change.id,
    ]),
    [
      ["product_part", "changed", "shell", "shell"],
      ["cluster", "changed", "control", "control"],
      ["module", "changed", "planner", "planner"],
      [
        "facade_boundary",
        "changed",
        "cluster:control:facade",
        "cluster:control:facade",
      ],
      ["module", "renamed", "legacy-export", "legacy-report-export"],
      [
        "facade_boundary",
        "renamed",
        "module:legacy-export:facade",
        "module:legacy-report-export:facade",
      ],
      ["module", "added", "audit-log", "audit-log"],
      [
        "facade_boundary",
        "added",
        "module:audit-log:facade",
        "module:audit-log:facade",
      ],
    ]
  );
});
