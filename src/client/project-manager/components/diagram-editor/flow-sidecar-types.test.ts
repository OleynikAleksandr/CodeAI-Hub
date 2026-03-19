import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFlowSidecarDocument,
  parseFlowSidecar,
  serializeFlowSidecar,
} from "./flow-sidecar-types";

test("flow sidecar preserves layout profile during serialization", () => {
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
          cluster: undefined,
          inputCount: 0,
          outputCount: 1,
        },
      },
    ],
    layoutProfile: "fill_space",
  });

  const parsed = parseFlowSidecar(serializeFlowSidecar(document));

  assert.notEqual(parsed, null);
  assert.equal(parsed?.layoutProfile, "fill_space");
  assert.deepEqual(parsed?.nodes["module-a"], { x: 120, y: 240 });
});

test("flow sidecar ignores unknown layout profile values", () => {
  const parsed = parseFlowSidecar(
    JSON.stringify({
      version: 1,
      revision: "rev-2",
      updated: new Date().toISOString(),
      nodes: {
        "module-a": { x: 0, y: 0 },
      },
      layoutProfile: "diagonal",
    })
  );

  assert.notEqual(parsed, null);
  assert.equal(parsed?.layoutProfile, undefined);
});
