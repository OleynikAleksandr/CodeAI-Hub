import assert from "node:assert/strict";
import test from "node:test";
import {
  applyFlowSidecarPositions,
  buildFlowSidecarDocument,
  parseFlowSidecar,
  serializeFlowSidecar,
} from "./flow-sidecar-types";

test("flow sidecar serializes manual node positions", () => {
  const document = buildFlowSidecarDocument({
    revision: "rev-1",
    nodes: [
      {
        id: "module-a",
        type: "module",
        position: { x: 120, y: 240 },
        data: {
          stage: "diagram_modules",
          nodeKind: "module",
          moduleId: "module-a",
          title: "Module A",
          kind: "service",
          responsibility: "A",
          status: "accepted",
          origin: "agent",
          productPart: "default-product-part",
          cluster: undefined,
          inputCount: 0,
          outputCount: 1,
        },
      },
    ],
  });

  const parsed = parseFlowSidecar(serializeFlowSidecar(document));

  assert.notEqual(parsed, null);
  assert.deepEqual(parsed?.nodes["module-a"], { x: 120, y: 240 });
});

test("flow sidecar ignores legacy layout profile fields", () => {
  const parsed = parseFlowSidecar(
    JSON.stringify({
      version: 1,
      revision: "rev-2",
      updated: new Date().toISOString(),
      nodes: {
        "module-a": { x: 0, y: 0 },
      },
      layoutProfile: "fill_space",
    })
  );

  assert.notEqual(parsed, null);
  assert.equal("layoutProfile" in (parsed ?? {}), false);
  assert.deepEqual(parsed?.nodes["module-a"], { x: 0, y: 0 });
});

test("flow sidecar preserves nested ownership node positions as layout-only data", () => {
  const document = buildFlowSidecarDocument({
    revision: "rev-nested",
    nodes: [
      {
        id: "product-part:control-shell",
        type: "cluster",
        position: { x: 40, y: 24 },
        data: {
          stage: "diagram_modules",
          nodeKind: "productPart",
          productPartId: "control-shell",
          title: "Control Shell",
          purpose: "Hosts the operator-facing runtime control surface.",
          clusterIds: ["security"],
          standaloneModuleIds: ["config-store"],
        },
      },
      {
        id: "cluster:security",
        type: "cluster",
        position: { x: 24, y: 72 },
        parentId: "product-part:control-shell",
        extent: "parent",
        data: {
          stage: "diagram_modules",
          nodeKind: "cluster",
          clusterId: "security",
          productPartId: "control-shell",
          title: "Security",
          purpose: "Keeps identity and session boundaries consistent.",
          moduleIds: ["auth-service"],
        },
      },
      {
        id: "auth-service",
        type: "module",
        position: { x: 24, y: 72 },
        parentId: "cluster:security",
        extent: "parent",
        data: {
          stage: "diagram_modules",
          nodeKind: "module",
          moduleId: "auth-service",
          title: "Auth Service",
          kind: "service",
          responsibility: "Authenticates operators and sessions.",
          status: "accepted",
          origin: "agent",
          productPart: "control-shell",
          cluster: "security",
          inputCount: 1,
          outputCount: 1,
        },
      },
      {
        id: "config-store",
        type: "module",
        position: { x: 24, y: 328 },
        parentId: "product-part:control-shell",
        extent: "parent",
        data: {
          stage: "diagram_modules",
          nodeKind: "module",
          moduleId: "config-store",
          title: "Config Store",
          kind: "store",
          responsibility: "Keeps runtime configuration readable.",
          status: "proposed",
          origin: "agent",
          productPart: "control-shell",
          cluster: undefined,
          inputCount: 1,
          outputCount: 1,
        },
      },
      {
        id: "activity-log",
        type: "module",
        position: { x: 344, y: 328 },
        parentId: "product-part:control-shell",
        extent: "parent",
        data: {
          stage: "diagram_modules",
          nodeKind: "module",
          moduleId: "activity-log",
          title: "Activity Log",
          kind: "store",
          responsibility: "Stores user-visible activity history.",
          status: "proposed",
          origin: "agent",
          productPart: "control-shell",
          cluster: undefined,
          inputCount: 1,
          outputCount: 1,
        },
      },
    ],
  });

  assert.deepEqual(document.nodes["product-part:control-shell"], { x: 40, y: 24 });
  assert.deepEqual(document.nodes["cluster:security"], { x: 24, y: 72 });
  assert.deepEqual(document.nodes["auth-service"], { x: 24, y: 72 });
  assert.deepEqual(document.nodes["config-store"], { x: 24, y: 328 });
  assert.deepEqual(document.nodes["activity-log"], { x: 344, y: 328 });
});

test("flow sidecar applies saved positions only when the diagram revision matches", () => {
  const nodes = [
    {
      id: "product-part:control-shell",
      type: "cluster" as const,
      position: { x: 0, y: 0 },
      data: {
        stage: "diagram_modules" as const,
        nodeKind: "productPart" as const,
        productPartId: "control-shell",
        title: "Control Shell",
        purpose: "Hosts the operator-facing runtime control surface.",
        clusterIds: ["security"],
        standaloneModuleIds: [],
      },
    },
  ];

  const applied = applyFlowSidecarPositions({
    nodes,
    document: {
      version: 1,
      revision: "rev-match",
      updated: new Date().toISOString(),
      nodes: {
        "product-part:control-shell": { x: 240, y: 160 },
      },
    },
    revision: "rev-match",
  });
  const skipped = applyFlowSidecarPositions({
    nodes,
    document: {
      version: 1,
      revision: "rev-stale",
      updated: new Date().toISOString(),
      nodes: {
        "product-part:control-shell": { x: 480, y: 320 },
      },
    },
    revision: "rev-current",
  });

  assert.deepEqual(applied[0]?.position, { x: 240, y: 160 });
  assert.deepEqual(skipped[0]?.position, { x: 0, y: 0 });
});

test("flow sidecar falls back to computed layout when sidecar does not cover all nodes", () => {
  const nodes = [
    {
      id: "product-part:shell",
      type: "cluster" as const,
      position: { x: 10, y: 20 },
      data: {
        stage: "diagram_modules" as const,
        nodeKind: "productPart" as const,
        productPartId: "shell",
        title: "Shell",
        purpose: "Entry point.",
        clusterIds: [],
        standaloneModuleIds: [],
      },
    },
    {
      id: "product-part:runtime",
      type: "cluster" as const,
      position: { x: 400, y: 20 },
      data: {
        stage: "diagram_modules" as const,
        nodeKind: "productPart" as const,
        productPartId: "runtime",
        title: "Runtime",
        purpose: "Core runtime.",
        clusterIds: [],
        standaloneModuleIds: [],
      },
    },
  ];

  const result = applyFlowSidecarPositions({
    nodes,
    document: {
      version: 1,
      revision: "rev-partial",
      updated: new Date().toISOString(),
      nodes: {
        "product-part:shell": { x: 500, y: 600 },
        // product-part:runtime is NOT in sidecar
      },
    },
    revision: "rev-partial",
  });

  // Must keep computed positions — sidecar is incomplete
  assert.deepEqual(result[0]?.position, { x: 10, y: 20 });
  assert.deepEqual(result[1]?.position, { x: 400, y: 20 });
});
