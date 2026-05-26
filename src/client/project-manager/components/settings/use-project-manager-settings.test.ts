import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { isWorkspaceSettingsPayloadForScope } from "../../services/project-manager-settings-client";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/settings/use-project-manager-settings.ts"
);

test("Project Manager settings payload scope matcher rejects stale workspace events", () => {
  const scope = {
    workspacePath: "/workspace/current",
    workspaceSlug: "current",
  };

  assert.equal(
    isWorkspaceSettingsPayloadForScope(
      {
        settings: {},
        workspacePath: "/workspace/current",
        workspaceSlug: "current",
      },
      scope
    ),
    true
  );
  assert.equal(
    isWorkspaceSettingsPayloadForScope(
      {
        settings: {},
        workspacePath: "/workspace/other",
        workspaceSlug: "other",
      },
      scope
    ),
    false
  );
  assert.equal(
    isWorkspaceSettingsPayloadForScope({ settings: {} }, scope),
    false
  );
  assert.equal(
    isWorkspaceSettingsPayloadForScope({ settings: {} }, undefined),
    true
  );
  assert.equal(
    isWorkspaceSettingsPayloadForScope(
      {
        settings: {},
        workspacePath: "/workspace/current",
        workspaceSlug: "current",
      },
      undefined
    ),
    false
  );
});

test("useProjectManagerSettings filters settings events by active workspace scope", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(
    source.includes("isWorkspaceSettingsPayloadForScope(message.payload, settingsScope)"),
    true,
    "settings panel must ignore loaded/saved/save-error events outside active workspace scope"
  );
});
