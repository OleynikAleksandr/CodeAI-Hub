import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const EMPTY_STATE_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/ui/src/session/empty-state.tsx"
);
const SESSION_VIEW_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/ui/src/session/session-view.tsx"
);
const USER_MESSAGES_SOURCE_PATH = path.resolve(
  process.cwd(),
  "assets/localization/source/en/messages_for_the_user.json"
);

test("session empty state routes foundation envelope through a dedicated localized copy path", async () => {
  const emptyStateSource = await readFile(EMPTY_STATE_SOURCE_PATH, "utf8");
  const sessionViewSource = await readFile(SESSION_VIEW_SOURCE_PATH, "utf8");
  const userMessagesSource = await readFile(USER_MESSAGES_SOURCE_PATH, "utf8");

  assert.equal(
    emptyStateSource.includes('stage === "foundation_envelope"'),
    true
  );
  assert.equal(
    emptyStateSource.includes(
      '"session.empty_state.foundation_envelope.title"'
    ),
    true
  );
  assert.equal(
    emptyStateSource.includes(
      '"session.empty_state.foundation_envelope.description"'
    ),
    true
  );
  assert.equal(sessionViewSource.includes("emptyStateStage"), true);
  assert.equal(
    userMessagesSource.includes(
      '"session.empty_state.foundation_envelope.title"'
    ),
    true
  );
  assert.equal(
    userMessagesSource.includes(
      '"session.empty_state.foundation_envelope.description"'
    ),
    true
  );
});
