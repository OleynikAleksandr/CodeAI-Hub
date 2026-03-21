import assert from "node:assert/strict";
import test from "node:test";
import {
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
