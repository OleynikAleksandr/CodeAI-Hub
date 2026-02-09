import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  isGeminiCliCompatibilityError,
  loadCliBridgeFromGlobal,
  resolveToolExecutionBackend,
} from "./cli-bridge";

const writeTextFile = async (
  filePath: string,
  content: string
): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
};

const createGeminiFixture = async (options: {
  readonly includeLegacyExecutor: boolean;
  readonly includeThoughtUtils: boolean;
}): Promise<{ readonly root: string; readonly cliRoot: string }> => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "gemini-cli-fixture-"));
  const cliRoot = path.join(fixtureRoot, "@google", "gemini-cli");
  const cliCoreRoot = path.join(
    cliRoot,
    "node_modules",
    "@google",
    "gemini-cli-core"
  );

  await writeTextFile(
    path.join(cliRoot, "package.json"),
    JSON.stringify(
      {
        name: "@google/gemini-cli",
        version: "9.9.9-fixture",
        type: "module",
      },
      null,
      2
    )
  );
  await writeTextFile(
    path.join(cliCoreRoot, "package.json"),
    JSON.stringify(
      {
        name: "@google/gemini-cli-core",
        version: "8.8.8-fixture",
        type: "module",
      },
      null,
      2
    )
  );

  await writeTextFile(
    path.join(cliRoot, "dist", "src", "config", "config.js"),
    "export const loadCliConfig = async () => ({ ok: true });\n"
  );
  await writeTextFile(
    path.join(cliRoot, "dist", "src", "config", "settings.js"),
    "export const loadSettings = () => ({ merged: {} });\n"
  );
  await writeTextFile(
    path.join(cliRoot, "dist", "src", "config", "extension.js"),
    "export const extension = {};\n"
  );
  await writeTextFile(
    path.join(
      cliRoot,
      "dist",
      "src",
      "config",
      "extensions",
      "extensionEnablement.js"
    ),
    "export const extensionEnablement = {};\n"
  );
  await writeTextFile(
    path.join(cliCoreRoot, "dist", "src", "core", "contentGenerator.js"),
    "export const AuthType = { LOGIN_WITH_GOOGLE: 'login_with_google' };\n"
  );
  await writeTextFile(
    path.join(cliCoreRoot, "dist", "src", "core", "coreToolScheduler.js"),
    "export class CoreToolScheduler { constructor(_options) {} async schedule() {} }\n"
  );
  await writeTextFile(
    path.join(cliCoreRoot, "dist", "src", "core", "turn.js"),
    "export const GeminiEventType = {};\n"
  );
  if (options.includeThoughtUtils) {
    await writeTextFile(
      path.join(cliCoreRoot, "dist", "src", "utils", "thoughtUtils.js"),
      "export const extractThoughtSummary = () => null;\n"
    );
  }
  if (options.includeLegacyExecutor) {
    await writeTextFile(
      path.join(
        cliCoreRoot,
        "dist",
        "src",
        "core",
        "nonInteractiveToolExecutor.js"
      ),
      "export const executeToolCall = async () => ({ status: 'success' });\n"
    );
  }

  return {
    root: fixtureRoot,
    cliRoot,
  };
};

test("resolveToolExecutionBackend returns scheduler fallback when tool executor is missing", () => {
  const backend = resolveToolExecutionBackend(null);
  assert.equal(backend, "scheduler_fallback");
});

test("loadCliBridgeFromGlobal falls back to scheduler backend when legacy executor is missing", async () => {
  const fixture = await createGeminiFixture({
    includeLegacyExecutor: false,
    includeThoughtUtils: true,
  });
  const previousRoot = process.env.CODEAI_HUB_GEMINI_CLI_ROOT;
  process.env.CODEAI_HUB_GEMINI_CLI_ROOT = fixture.cliRoot;
  try {
    const bridge = await loadCliBridgeFromGlobal();
    assert.equal(bridge.modules.toolExecutionBackend, "scheduler_fallback");
    assert.equal(bridge.modules.toolExecutor, null);
    assert.equal(
      bridge.metadata.cliCore?.toolExecutionBackend,
      "scheduler_fallback"
    );
  } finally {
    if (previousRoot === undefined) {
      process.env.CODEAI_HUB_GEMINI_CLI_ROOT = undefined;
    } else {
      process.env.CODEAI_HUB_GEMINI_CLI_ROOT = previousRoot;
    }
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("loadCliBridgeFromGlobal wraps required-module failures as compatibility errors", async () => {
  const fixture = await createGeminiFixture({
    includeLegacyExecutor: false,
    includeThoughtUtils: false,
  });
  const previousRoot = process.env.CODEAI_HUB_GEMINI_CLI_ROOT;
  process.env.CODEAI_HUB_GEMINI_CLI_ROOT = fixture.cliRoot;
  try {
    await assert.rejects(
      async () => {
        await loadCliBridgeFromGlobal();
      },
      (error: unknown) => {
        assert.equal(isGeminiCliCompatibilityError(error), true);
        return true;
      }
    );
  } finally {
    if (previousRoot === undefined) {
      process.env.CODEAI_HUB_GEMINI_CLI_ROOT = undefined;
    } else {
      process.env.CODEAI_HUB_GEMINI_CLI_ROOT = previousRoot;
    }
    await rm(fixture.root, { recursive: true, force: true });
  }
});
