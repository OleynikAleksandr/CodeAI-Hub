import assert from "node:assert/strict";
import test from "node:test";
import {
  extractTaskScopePatterns,
  getOutOfScopePaths,
  parsePorcelainPaths,
  pathMatchesScope,
} from "./plan-scope-boundary.mjs";

const createMarkdown = () => `# Development TODO Plan

<!-- codeai-plan-state:start -->
\`\`\`json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "plan-orchestrator-2026-05-09",
  "branch": "main",
  "baseHead": "1111111",
  "lastRecordedCommit": "1111111",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Plan_Orchestrator_Architecture.md",
  "currentTaskId": "phase1.task1",
  "expectedCommitMessage": "feat: add plan commit scope boundary",
  "debt": null
}
\`\`\`
<!-- codeai-plan-state:end -->

1. [IN_PROGRESS] \`phase1.task1\` Add boundary parser (scope: \`scripts/plan-orchestrator/**, doc/TODO/todo-plan.md\`; expected commit: \`feat: add plan commit scope boundary\`).
2. [TODO] Git Commit: \`feat: add plan commit scope boundary\` (hash: TBD)
`;

test("extracts current task scope patterns and always allows todo plan", () => {
  const patterns = extractTaskScopePatterns(createMarkdown(), "phase1.task1");

  assert.deepEqual(patterns, [
    "scripts/plan-orchestrator/**",
    "doc/TODO/todo-plan.md",
  ]);
});

test("matches exact files, directory scopes, and glob scopes", () => {
  assert.equal(
    pathMatchesScope(
      "scripts/plan-orchestrator/plan-commit.mjs",
      "scripts/plan-orchestrator/**"
    ),
    true
  );
  assert.equal(
    pathMatchesScope("packages/core/src/index.ts", "packages/core"),
    true
  );
  assert.equal(pathMatchesScope("package.json", "package.json"), true);
  assert.equal(pathMatchesScope("src/client/app.ts", "packages/core"), false);
});

test("reports dirty paths outside the current task scope", () => {
  const patterns = extractTaskScopePatterns(createMarkdown(), "phase1.task1");

  assert.deepEqual(
    getOutOfScopePaths(
      [
        "scripts/plan-orchestrator/plan-commit.mjs",
        "doc/TODO/todo-plan.md",
        "src/client/project-manager/api.ts",
      ],
      patterns
    ),
    ["src/client/project-manager/api.ts"]
  );
});

test("parses modified, untracked, deleted, and renamed porcelain paths", () => {
  assert.deepEqual(
    parsePorcelainPaths(
      [
        " M doc/TODO/todo-plan.md",
        "?? scripts/plan-orchestrator/plan-scope-boundary.mjs",
        "D  old-file.ts",
        "R  old-name.ts -> new-name.ts",
        "",
      ].join("\n")
    ),
    [
      "doc/TODO/todo-plan.md",
      "scripts/plan-orchestrator/plan-scope-boundary.mjs",
      "old-file.ts",
      "old-name.ts",
      "new-name.ts",
    ]
  );
});
