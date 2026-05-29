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

test("useProjectManagerSettings keeps scoped settings strict but allows the shell to follow active workspace payloads", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(
    source.includes("shouldApplySettingsPayload(message.payload, settingsScope)"),
    true,
    "settings panel must ignore stale scoped events while the Project Manager shell can consume active scoped payloads"
  );
  assert.equal(
    source.includes("settingsScope ? null : api.getLastSettingsPayload()"),
    true,
    "unscoped Project Manager shell should hydrate from the last active workspace settings payload"
  );
  assert.equal(
    source.includes("if (settingsScope) {\n      api.loadSettings(settingsScope);"),
    true,
    "settings hook must not issue fallback no-scope settings loads"
  );
  assert.equal(
    source.includes("if (payload.localizationRuntime)"),
    true,
    "settings reloads must not drop the active localization runtime while Core is resolving the next payload"
  );
  assert.equal(source.includes("setLocalizationRuntime(payload.localizationRuntime ?? null)"), false);
});
