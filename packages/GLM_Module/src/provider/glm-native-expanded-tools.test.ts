import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { GlmToolCall } from "./glm-native-sse-parser";
import { executeGlmNativeTool } from "./glm-native-tool-executors";

const ANCHOR_LINE_PATTERN = /^\d+:([A-Za-z0-9_-]{3})\u2502/u;
const CLASS_SAMPLE_TOOL_PATTERN = /class SampleTool/u;
const EXTRA_FIELD_PATTERN = /extra = true/u;
const RETURN_TWO_PATTERN = /return 2/u;
const SAMPLE_TOOL_PATTERN = /SampleTool/u;
const SAMPLE_TS_PATTERN = /sample\.ts/u;
const TESTS_OK_PATTERN = /tests-ok/u;
const USE_SAMPLE_PATTERN = /useSample/u;

test("GLM expanded file tools read anchors and edit by anchor", async () => {
  const workspacePath = await mkdtemp(path.join(os.tmpdir(), "glm-anchor-"));
  const filePath = path.join(workspacePath, "sample.ts");
  await writeFile(
    filePath,
    "export class Sample {\n  value() { return 1; }\n}\n",
    "utf8"
  );

  try {
    const readResult = await callTool(
      "read_file_anchored",
      {
        path: "sample.ts",
      },
      workspacePath
    );
    assert.equal(readResult.ok, true);
    const anchor = String(readResult.content)
      .split("\n")[1]
      ?.match(ANCHOR_LINE_PATTERN)?.[1];
    assert.equal(typeof anchor, "string");

    const editResult = await callTool(
      "edit_file_by_anchor",
      {
        edits: [{ insert_after: anchor, new_lines: ["  extra = true;"] }],
        path: "sample.ts",
      },
      workspacePath
    );
    assert.equal(editResult.ok, true);
    assert.match(await readFile(filePath, "utf8"), EXTRA_FIELD_PATTERN);

    const exactEdit = await callTool(
      "edit_file",
      {
        new_string: "return 2",
        old_string: "return 1",
        path: "sample.ts",
      },
      workspacePath
    );
    assert.equal(exactEdit.ok, true);
    assert.match(await readFile(filePath, "utf8"), RETURN_TWO_PATTERN);
  } finally {
    await rm(workspacePath, { force: true, recursive: true });
  }
});

test("GLM expanded workspace tools return structured search git and test results", async () => {
  if (spawnSync("rg", ["--version"]).status !== 0) {
    return;
  }
  if (spawnSync("git", ["--version"]).status !== 0) {
    return;
  }
  const workspacePath = await mkdtemp(path.join(os.tmpdir(), "glm-workspace-"));
  await writeFile(
    path.join(workspacePath, "sample.ts"),
    "export class SampleTool {}\nconst useSample = new SampleTool();\n",
    "utf8"
  );
  spawnSync("git", ["init"], { cwd: workspacePath });

  try {
    const symbols = await callTool(
      "workspace_symbols",
      { query: "SampleTool" },
      workspacePath
    );
    assert.equal(symbols.ok, true);
    assert.match(String(symbols.symbols), SAMPLE_TOOL_PATTERN);

    const definitions = await callTool(
      "go_to_definition",
      { symbol: "SampleTool" },
      workspacePath
    );
    assert.equal(definitions.ok, true);
    assert.equal(definitions.semantic, false);
    assert.match(String(definitions.definitions), CLASS_SAMPLE_TOOL_PATTERN);

    const references = await callTool(
      "find_references",
      { symbol: "SampleTool" },
      workspacePath
    );
    assert.equal(references.ok, true);
    assert.match(String(references.matches), USE_SAMPLE_PATTERN);

    const status = await callTool("git_status", {}, workspacePath);
    assert.equal(status.ok, true);
    assert.match(String(status.output), SAMPLE_TS_PATTERN);

    const tests = await callTool(
      "run_tests",
      { cmd: 'node -e "console.log(\\"tests-ok\\")"', timeout_ms: 5000 },
      workspacePath
    );
    assert.equal(tests.ok, true);
    assert.match(String(tests.stdout), TESTS_OK_PATTERN);
  } finally {
    await rm(workspacePath, { force: true, recursive: true });
  }
});

const callTool = (
  name: string,
  args: Record<string, unknown>,
  workspacePath: string
): Promise<Record<string, unknown>> =>
  executeGlmNativeTool(
    {
      function: { arguments: JSON.stringify(args), name },
      id: `call_${name}`,
      type: "function",
    } satisfies GlmToolCall,
    workspacePath
  );
