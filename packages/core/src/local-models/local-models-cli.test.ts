import assert from "node:assert/strict";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createDefaultLmsCommandRunner,
  resolveLmsCommandCandidates,
} from "./local-models-cli";

const SERVER_RUNNING_OUTPUT_PATTERN = /server is running/u;

test("resolveLmsCommandCandidates includes LM Studio user-bin fallback", () => {
  const candidates = resolveLmsCommandCandidates();

  assert.equal(candidates[0], "lms");
  assert.ok(
    candidates.includes(path.join(homedir(), ".lmstudio", "bin", "lms"))
  );
});

test("createDefaultLmsCommandRunner captures LM Studio stderr output", async () => {
  const binDirectory = await mkdtemp(path.join(tmpdir(), "codeai-lms-cli-"));
  const lmsPath = path.join(binDirectory, "lms");
  const originalPath = process.env.PATH;

  await writeFile(
    lmsPath,
    [
      "#!/bin/sh",
      'echo "The server is running on port 1234." >&2',
      "exit 0",
      "",
    ].join("\n"),
    "utf8"
  );
  await chmod(lmsPath, 0o755);
  process.env.PATH = `${binDirectory}:${originalPath ?? ""}`;

  try {
    const output = createDefaultLmsCommandRunner()(["server", "status"], {
      timeoutMs: 1000,
    });
    assert.match(output, SERVER_RUNNING_OUTPUT_PATTERN);
  } finally {
    process.env.PATH = originalPath;
    await rm(binDirectory, { force: true, recursive: true });
  }
});
