import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const HANDLER_PATH = path.resolve(
  process.cwd(),
  "src/extension-module/message-handlers/project-manager-file-link-handler.ts"
);

test("project-manager file link handler keeps validation and VS Code editor reveal contract", async () => {
  const source = await readFile(HANDLER_PATH, "utf8");

  assert.equal(
    source.includes(
      'typeof candidate.path !== "string" || !candidate.path.trim()'
    ),
    true,
    "handler must reject invalid or blank file paths"
  );
  assert.equal(
    source.includes("line: toPositiveInteger(candidate.line)"),
    true,
    "handler must normalize line numbers through positive-integer validation"
  );
  assert.equal(
    source.includes("column: toPositiveInteger(candidate.column)"),
    true,
    "handler must normalize column numbers through positive-integer validation"
  );
  assert.equal(
    source.includes("workspace.openTextDocument(Uri.file(request.path))"),
    true,
    "handler must open the requested local file through the VS Code document API"
  );
  assert.equal(
    source.includes("window.showTextDocument(document"),
    true,
    "handler must reveal the file in the VS Code editor"
  );
  assert.equal(
    source.includes("new Selection(position, position)"),
    true,
    "handler must place the editor cursor at the requested location"
  );
  assert.equal(
    source.includes("editor.revealRange(new Range(position, position))"),
    true,
    "handler must reveal the requested line or column after opening the file"
  );
});
