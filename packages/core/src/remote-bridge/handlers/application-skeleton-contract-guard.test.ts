import assert from "node:assert/strict";
import test from "node:test";
import { evaluateApplicationSkeletonContractGuard } from "./application-skeleton-contract-guard";
import type { ApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";

const buildProgressSnapshot = (
  override: Partial<ApplicationSkeletonProgressSnapshot>
): ApplicationSkeletonProgressSnapshot => ({
  accepted: false,
  mapExists: false,
  mappingReady: false,
  markdownExists: false,
  materializationState: "artifact",
  materialized: false,
  observedMaterialization: false,
  substep: "artifact",
  validationErrors: [],
  ...override,
});

test("guard noop when no terminal event arrived yet", () => {
  const decision = evaluateApplicationSkeletonContractGuard({
    ownedDirtyFiles: [
      ".codeai-hub/demo/application_skeleton/application-skeleton.md",
    ],
    phase: "phase_1a_draft",
    progress: buildProgressSnapshot({
      markdownExists: true,
      mapExists: true,
      mappingReady: true,
    }),
    terminalEventReceived: false,
  });
  assert.equal(decision.kind, "noop");
  assert.equal(
    decision.kind === "noop" && decision.reason,
    "no_terminal_event"
  );
});

test("guard noop when phase is outside Phase 1A scope", () => {
  for (const phase of [
    "phase_1b_review",
    "phase_2_materialization",
    "phase_handoff",
  ] as const) {
    const decision = evaluateApplicationSkeletonContractGuard({
      ownedDirtyFiles: [],
      phase,
      progress: null,
      terminalEventReceived: true,
    });
    assert.equal(decision.kind, "noop");
    assert.equal(
      decision.kind === "noop" && decision.reason,
      "out_of_scope_phase"
    );
  }
});

test("guard repair_no_progress in Phase 1A when terminal arrives without owned diff", () => {
  const decision = evaluateApplicationSkeletonContractGuard({
    ownedDirtyFiles: [],
    phase: "phase_1a_draft",
    progress: null,
    terminalEventReceived: true,
  });
  assert.equal(decision.kind, "repair_no_progress");
  assert.equal(
    decision.kind === "repair_no_progress" && decision.reason,
    "terminal_no_owned_diff_in_phase_1a"
  );
});

test("guard commit_ready when terminal + owned diff produces a structurally complete draft", () => {
  const decision = evaluateApplicationSkeletonContractGuard({
    ownedDirtyFiles: [
      ".codeai-hub/demo/application_skeleton/application-skeleton.md",
      ".codeai-hub/demo/application_skeleton/application-skeleton-map.json",
    ],
    phase: "phase_1a_draft",
    progress: buildProgressSnapshot({
      markdownExists: true,
      mapExists: true,
      mappingReady: true,
      substep: "awaiting_acceptance",
    }),
    terminalEventReceived: true,
  });
  assert.equal(decision.kind, "commit_ready");
});

test("guard repair_invalid_draft when implicit readiness has structural gaps", () => {
  const decision = evaluateApplicationSkeletonContractGuard({
    ownedDirtyFiles: [
      ".codeai-hub/demo/application_skeleton/application-skeleton.md",
    ],
    phase: "phase_1a_draft",
    progress: buildProgressSnapshot({
      markdownExists: true,
      mapExists: false,
      mappingReady: false,
    }),
    terminalEventReceived: true,
  });
  assert.equal(decision.kind, "repair_invalid_draft");
  if (decision.kind !== "repair_invalid_draft") {
    return;
  }
  assert.equal(decision.reason, "implicit_readiness_with_invalid_draft");
  assert.ok(
    decision.details.some((entry) =>
      entry.includes("application-skeleton-map.json is missing")
    )
  );
});

test("guard repair_invalid_draft surfaces validator errors when map exists but is unparseable", () => {
  const decision = evaluateApplicationSkeletonContractGuard({
    ownedDirtyFiles: [
      ".codeai-hub/demo/application_skeleton/application-skeleton-map.json",
    ],
    phase: "phase_1a_draft",
    progress: buildProgressSnapshot({
      markdownExists: true,
      mapExists: true,
      mappingReady: false,
      validationErrors: ["application-skeleton-map.json schema mismatch"],
    }),
    terminalEventReceived: true,
  });
  assert.equal(decision.kind, "repair_invalid_draft");
  if (decision.kind !== "repair_invalid_draft") {
    return;
  }
  assert.ok(
    decision.details.some((entry) =>
      entry.includes("application-skeleton-map.json is not parseable")
    )
  );
  assert.ok(
    decision.details.some((entry) =>
      entry.includes("application-skeleton-map.json schema mismatch")
    )
  );
});

test("guard returns repair_premature_materialization when premature decision is blocked in Phase 1A or 1B", () => {
  for (const phase of ["phase_1a_draft", "phase_1b_review"] as const) {
    const decision = evaluateApplicationSkeletonContractGuard({
      ownedDirtyFiles: [
        "product-parts/demo/README.md",
        ".codeai-hub/demo/application_skeleton/application-skeleton.md",
      ],
      phase,
      prematureDecision: {
        blockedPaths: ["product-parts/demo/README.md"],
        kind: "blocked",
        reasons: [
          "Application Skeleton must be accepted before touching materialization-owned paths.",
        ],
      },
      progress: buildProgressSnapshot({
        markdownExists: true,
        mapExists: true,
        mappingReady: true,
      }),
      terminalEventReceived: true,
    });
    assert.equal(decision.kind, "repair_premature_materialization");
    if (decision.kind === "repair_premature_materialization") {
      assert.deepEqual(decision.blockedPaths, ["product-parts/demo/README.md"]);
    }
  }
});

test("guard ignores premature decision when phase is not Phase 1A or 1B", () => {
  const decision = evaluateApplicationSkeletonContractGuard({
    ownedDirtyFiles: ["product-parts/demo/README.md"],
    phase: "phase_2_materialization",
    prematureDecision: {
      blockedPaths: ["product-parts/demo/README.md"],
      kind: "blocked",
      reasons: ["pretend block"],
    },
    progress: buildProgressSnapshot({
      accepted: true,
      markdownExists: true,
      mapExists: true,
      mappingReady: true,
    }),
    terminalEventReceived: true,
  });
  assert.equal(decision.kind, "noop");
});

test("guard repair_invalid_draft when progress snapshot is unavailable mid-draft", () => {
  const decision = evaluateApplicationSkeletonContractGuard({
    ownedDirtyFiles: [
      ".codeai-hub/demo/application_skeleton/application-skeleton.md",
    ],
    phase: "phase_1a_draft",
    progress: null,
    terminalEventReceived: true,
  });
  assert.equal(decision.kind, "repair_invalid_draft");
  if (decision.kind !== "repair_invalid_draft") {
    return;
  }
  assert.deepEqual(decision.details, ["progress snapshot unavailable"]);
});
