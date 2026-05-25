#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const SOURCE_ROOTS = ["src", "packages"];
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const TEST_FILE_RE = /\.test\.[cm]?[tj]sx?$/u;

const rules = [
  {
    id: "runtime-slices-removed",
    message: "runtime-slices copy/restore rollback must not return.",
    patterns: [
      /runtime-slices/u,
      /WorkflowRuntimeSlice/u,
      /captureWorkflowRuntimeSlices/u,
      /restoreWorkflowRuntimeSlices/u,
    ],
  },
  {
    id: "manual-clean-paths-removed",
    message: "Clear must use full Git rollback plus git clean, not cleanPaths.",
    patterns: [/cleanPaths/u, /DEFAULT_CLEAN_PATHS/u],
  },
  {
    id: "registry-authority-commits-removed",
    message: "Boundary registry must not be treated as rollback authority.",
    patterns: [/registry-authority/u, /registryAuthority/u],
  },
  {
    allow: [
      "packages/core/src/remote-bridge/handlers/session-request-handler-continuity-root.ts",
    ],
    id: "workflow-sessions-owned-by-workspace",
    message:
      "Workflow sessions must resolve under the workspace runtime capsule.",
    patterns: [/\.codeai-hub\/sessions/u],
  },
  {
    allow: [
      "packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller.ts",
      "packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.ts",
      "packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-repair-controller.ts",
      "packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-review-acceptance.ts",
      "packages/core/src/managed-workflow-orchestration/managed-workflow-scaffold-installer.ts",
      "packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.ts",
    ],
    allowTests: true,
    id: "managed-git-helper-contained",
    message:
      "Direct DiagramModulesManagedGitBoundary construction must stay contained while controllers finish migrating.",
    patterns: [/new DiagramModulesManagedGitBoundary/u],
  },
];

const listTrackedSourceFiles = () =>
  execFileSync("git", ["ls-files", ...SOURCE_ROOTS], {
    encoding: "utf8",
  })
    .split("\n")
    .filter((file) => file.length > 0 && hasTextExtension(file));

const hasTextExtension = (file) => {
  const dotIndex = file.lastIndexOf(".");
  return dotIndex >= 0 && TEXT_EXTENSIONS.has(file.slice(dotIndex));
};

const isAllowed = (rule, file) =>
  (rule.allowTests && TEST_FILE_RE.test(file)) ||
  (rule.allow ?? []).includes(file);

const findViolations = () => {
  const violations = [];
  for (const file of listTrackedSourceFiles()) {
    const source = readFileSync(file, "utf8");
    for (const rule of rules) {
      if (isAllowed(rule, file)) {
        continue;
      }
      for (const pattern of rule.patterns) {
        if (pattern.test(source)) {
          violations.push({ file, pattern: String(pattern), rule });
        }
      }
    }
  }
  return violations;
};

const violations = findViolations();
if (violations.length === 0) {
  console.log("Workflow rollback architecture guard passed.");
  process.exit(0);
}

console.error("Workflow rollback architecture guard failed:");
for (const violation of violations) {
  console.error(
    `- [${violation.rule.id}] ${violation.file} matches ${violation.pattern}`
  );
  console.error(`  ${violation.rule.message}`);
}
process.exit(1);
