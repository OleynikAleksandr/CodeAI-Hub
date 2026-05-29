import assert from "node:assert/strict";
import { homedir } from "node:os";
import path from "node:path";
import test from "node:test";
import { resolveLmsCommandCandidates } from "./local-models-cli";

test("resolveLmsCommandCandidates includes LM Studio user-bin fallback", () => {
  const candidates = resolveLmsCommandCandidates();

  assert.equal(candidates[0], "lms");
  assert.ok(
    candidates.includes(path.join(homedir(), ".lmstudio", "bin", "lms"))
  );
});
