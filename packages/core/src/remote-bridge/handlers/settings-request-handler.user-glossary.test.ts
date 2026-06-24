import assert from "node:assert/strict";
import { access, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { CoreConfig } from "../../config";
import type { Logger } from "../../telemetry/logger";
import { resolveWorkspaceRuntimeCapsule } from "../../workflow/runtime/workspace-runtime-capsule";
import type { BridgeEvent } from "../types";
import { SettingsRequestHandler } from "./settings-request-handler";

const createConfig = (params: {
  readonly globalSettingsPath: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): CoreConfig => ({
  claudeContinuityRemainingPercentThreshold: 30,
  claudeDefaultModel: "sonnet",
  claudeProjectSlug: params.workspaceSlug,
  claudeSettingsPath: params.globalSettingsPath,
  claudeWorkspacePath: params.workspaceRoot,
  codexDefaultModel: "gpt-5.3-codex",
  codexDefaultReasoningEffort: "medium",
  codexSkipGitRepoCheck: false,
  continuityPreemptRemainingPercentThreshold: 50,
  globalSettingsPath: params.globalSettingsPath,
  host: "127.0.0.1",
  idleTtlMinutes: null,
  managedMode: null,
  port: 8080,
  shutdownGracePeriodMs: 0,
  templatesDir: path.join(params.workspaceRoot, "templates"),
});

const logger = {
  warn() {
    return undefined;
  },
} as unknown as Logger;

test("SettingsRequestHandler opens user glossary in global localization runtime", async () => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "codeai-glossary-"));
  const workspaceRoot = path.join(tempRoot, "workspace");
  const workspaceSlug = "workspace-glossary";
  const fakeHome = path.join(tempRoot, "home");
  const originalHome = process.env.HOME;
  process.env.HOME = fakeHome;
  const events: BridgeEvent[] = [];

  try {
    const config = createConfig({
      globalSettingsPath: path.join(tempRoot, "global", "settings.json"),
      workspaceRoot,
      workspaceSlug,
    });
    const handler = new SettingsRequestHandler({
      broadcaster: (event) => events.push(event),
      config,
      logger,
    });

    await handler.handleOpenUserGlossaryFile();

    const capsule = resolveWorkspaceRuntimeCapsule({
      workspaceRoot,
      workspaceSlug,
    });
    const expectedPath = path.join(
      tempRoot,
      "localization",
      "glossary",
      "do-not-translate-terms.txt"
    );
    assert.deepEqual(events.at(-1), {
      type: "settings:user-glossary-file",
      payload: { path: expectedPath },
    });
    await access(expectedPath);
    await assert.rejects(
      access(path.join(capsule.localizationRoot.absolutePath, "glossary")),
      { code: "ENOENT" }
    );
  } finally {
    process.env.HOME = originalHome;
  }
});
