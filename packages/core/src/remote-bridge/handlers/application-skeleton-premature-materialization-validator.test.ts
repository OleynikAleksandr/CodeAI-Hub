import assert from "node:assert/strict";
import test from "node:test";
import { evaluateApplicationSkeletonPrematureMaterialization } from "./application-skeleton-premature-materialization-validator";

const buildMap = (
  productParts: ReadonlyArray<{
    readonly clusters?: ReadonlyArray<{
      readonly codePath: string;
      readonly modules?: ReadonlyArray<{ readonly codePath: string }>;
    }>;
    readonly codePath: string;
  }>,
  declared: readonly string[] = []
): Record<string, unknown> => ({
  materializedPaths: declared,
  productParts,
  schema: "codeai-application-skeleton-v1",
});

test("validator permits acceptance once stage is accepted (Phase 2 territory)", () => {
  const decision = evaluateApplicationSkeletonPrematureMaterialization({
    accepted: true,
    mapJson: buildMap([{ codePath: "product-parts/demo" }]),
    ownedDirtyFiles: ["product-parts/demo/README.md"],
  });
  assert.equal(decision.kind, "permitted");
});

test("validator permits when there are no owned dirty files", () => {
  const decision = evaluateApplicationSkeletonPrematureMaterialization({
    accepted: false,
    mapJson: buildMap([{ codePath: "product-parts/demo" }]),
    ownedDirtyFiles: [],
  });
  assert.equal(decision.kind, "permitted");
});

test("validator permits when the map declares no materialization paths", () => {
  const decision = evaluateApplicationSkeletonPrematureMaterialization({
    accepted: false,
    mapJson: buildMap([]),
    ownedDirtyFiles: ["product-parts/demo/README.md"],
  });
  assert.equal(decision.kind, "permitted");
});

test("validator blocks owned writes inside declared materialization scope", () => {
  const decision = evaluateApplicationSkeletonPrematureMaterialization({
    accepted: false,
    mapJson: buildMap(
      [{ codePath: "product-parts/demo" }],
      ["product-parts/demo"]
    ),
    ownedDirtyFiles: [
      ".codeai-hub/demo/application_skeleton/application-skeleton.md",
      "product-parts/demo/README.md",
    ],
  });
  assert.equal(decision.kind, "blocked");
  if (decision.kind === "blocked") {
    assert.deepEqual(decision.blockedPaths, ["product-parts/demo/README.md"]);
    assert.ok(
      decision.reasons.some((entry) =>
        entry.includes("must be accepted before touching")
      )
    );
  }
});

test("validator derives blocked scope from cluster/module codePath entries when materializedPaths missing", () => {
  const decision = evaluateApplicationSkeletonPrematureMaterialization({
    accepted: false,
    mapJson: buildMap([
      {
        clusters: [
          {
            codePath: "product-parts/demo/clusters/ui",
            modules: [{ codePath: "product-parts/demo/clusters/ui/modules/m" }],
          },
        ],
        codePath: "product-parts/demo",
      },
    ]),
    ownedDirtyFiles: ["product-parts/demo/clusters/ui/modules/m/index.ts"],
  });
  assert.equal(decision.kind, "blocked");
});

test("validator ignores draft writes outside the materialization scope", () => {
  const decision = evaluateApplicationSkeletonPrematureMaterialization({
    accepted: false,
    mapJson: buildMap(
      [{ codePath: "product-parts/demo" }],
      ["product-parts/demo"]
    ),
    ownedDirtyFiles: [
      ".codeai-hub/demo/application_skeleton/application-skeleton.md",
      ".codeai-hub/demo/application_skeleton/application-skeleton-map.json",
    ],
  });
  assert.equal(decision.kind, "permitted");
});
