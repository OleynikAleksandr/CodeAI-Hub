import assert from "node:assert/strict";
import test from "node:test";
import {
  type ManagedQualityGateManifest,
  renderManagedHookRegistrySections,
  validateManagedQualityGateManifest,
} from "./managed-hook-registry";

const PLAN_VALIDATE_RE = /plan-cli\.mjs validate/u;
const FORMAT_CHECK_RE = /npm run format:check/u;
const TEST_SMOKE_RE = /npm run test:smoke/u;
const DUPLICATE_GATE_RE = /duplicates active required gate format-check/u;
const ACTIVE_EXECUTABLE_RE = /must be active and executable/u;

const MANIFEST: ManagedQualityGateManifest = {
  commands: {
    "format-check": {
      availability: "executable",
      desiredStatus: "active",
      id: "format-check",
      proposedCommand: "npm run format:check",
    },
    "test-smoke": {
      availability: "executable",
      desiredStatus: "active",
      id: "test-smoke",
      proposedCommand: "npm run test:smoke",
    },
  },
  requiredBeforeCommit: ["format-check"],
  requiredBeforePush: ["test-smoke"],
};

test("renderManagedHookRegistrySections renders baseline and gate commands", () => {
  const sections = renderManagedHookRegistrySections(MANIFEST);

  assert.match(sections["pre-commit"] ?? "", PLAN_VALIDATE_RE);
  assert.match(sections["pre-commit"] ?? "", FORMAT_CHECK_RE);
  assert.match(sections["pre-push"] ?? "", TEST_SMOKE_RE);
});

test("validateManagedQualityGateManifest rejects planned required duplicates", () => {
  const validation = validateManagedQualityGateManifest({
    ...MANIFEST,
    plannedRequiredAfterIntegration: ["format-check"],
  });

  assert.equal(validation.ok, false);
  assert.match(validation.issues.join("\n"), DUPLICATE_GATE_RE);
});

test("renderManagedHookRegistrySections rejects non executable required gates", () => {
  assert.throws(
    () =>
      renderManagedHookRegistrySections({
        commands: {
          "format-check": {
            availability: "not_integrated",
            desiredStatus: "active",
            id: "format-check",
            proposedCommand: "npm run format:check",
          },
        },
        requiredBeforeCommit: ["format-check"],
      }),
    ACTIVE_EXECUTABLE_RE
  );
});
