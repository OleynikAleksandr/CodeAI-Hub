import assert from "node:assert/strict";
import test from "node:test";
import { parsePlanStateMarkdown } from "./plan-state-parser.mjs";
import {
  PLAN_STATE_BLOCK_END,
  PLAN_STATE_BLOCK_START,
} from "./plan-state-types.mjs";

const createMarkdown = (json) => `# План разработки

${PLAN_STATE_BLOCK_START}
\`\`\`json
${json}
\`\`\`
${PLAN_STATE_BLOCK_END}

## Recovery Pack
`;

const validState = {
  baseHead: "0debb4a32",
  branch: "main",
  currentTaskId: "phase1.stream1.task5",
  debt: null,
  executionScopeStatus: "ACTIVE",
  expectedCommitMessage: "feat: add plan state parser",
  lastRecordedCommit: "0debb4a32",
  planId: "plan-orchestrator-2026-05-03",
  planningSource:
    "doc/SolidWorks-WorkFlow/Plans/Plan_Orchestrator_Architecture.md",
  schema: "codeai-plan-v1",
};

test("parses a valid codeai-plan-state block", () => {
  const markdown = createMarkdown(JSON.stringify(validState, null, 2));

  const result = parsePlanStateMarkdown(markdown, "doc/TODO/todo-plan.md");

  assert.deepEqual(result.state, validState);
  assert.equal(result.block.rawJson, JSON.stringify(validState, null, 2));
  assert.equal(result.block.start, markdown.indexOf(PLAN_STATE_BLOCK_START));
  assert.equal(
    result.block.end,
    markdown.indexOf(PLAN_STATE_BLOCK_END) + PLAN_STATE_BLOCK_END.length
  );
});

test("fails when the codeai-plan-state block is missing", () => {
  assert.throws(
    () => parsePlanStateMarkdown("# План разработки"),
    (error) => error.code === "PLAN_STATE_BLOCK_MISSING"
  );
});

test("fails when the codeai-plan-state JSON is malformed", () => {
  const markdown = createMarkdown('{"schema": "codeai-plan-v1",');

  assert.throws(
    () => parsePlanStateMarkdown(markdown),
    (error) => error.code === "PLAN_STATE_JSON_INVALID"
  );
});

test("fails when the codeai-plan-state schema is unsupported", () => {
  const markdown = createMarkdown(
    JSON.stringify({ ...validState, schema: "codeai-plan-v2" })
  );

  assert.throws(
    () => parsePlanStateMarkdown(markdown),
    (error) => error.code === "PLAN_STATE_UNSUPPORTED_SCHEMA"
  );
});
