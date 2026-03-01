import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const INPUT_BUTTON_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/ui/src/session/input-play-stop-button.tsx"
);

const SESSION_VIEW_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/ui/src/session/session-view.tsx"
);

test("Description runtime input action does not include restart-attempt branch", async () => {
  const [inputButtonSource, sessionViewSource] = await Promise.all([
    readFile(INPUT_BUTTON_SOURCE_PATH, "utf8"),
    readFile(SESSION_VIEW_SOURCE_PATH, "utf8"),
  ]);

  assert.equal(
    inputButtonSource.includes("pm:description:restart-attempt"),
    false
  );
  assert.equal(inputButtonSource.includes("RestartAttemptButton"), false);
  assert.equal(sessionViewSource.includes("descriptionRestartAttempt"), false);
});
