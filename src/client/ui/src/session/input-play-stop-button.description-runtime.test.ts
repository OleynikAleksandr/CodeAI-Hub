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

test("managed review confirmation activates the next workflow card", async () => {
  const sessionViewSource = await readFile(SESSION_VIEW_SOURCE_PATH, "utf8");

  assert.equal(sessionViewSource.includes("NEXT_STAGE_BY_REVIEW_STAGE"), true);
  assert.equal(
    sessionViewSource.includes('description: "virtual_simulation"'),
    true
  );
  assert.equal(
    sessionViewSource.includes('virtual_simulation: "diagram_modules"'),
    true
  );
  assert.equal(
    sessionViewSource.includes('diagram_modules: "application_skeleton"'),
    true
  );
  assert.equal(sessionViewSource.includes('"pm:stage:activated"'), true);
  assert.equal(sessionViewSource.includes('"managed-review-confirm"'), true);
});
