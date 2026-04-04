import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  isGeminiCliCompatibilityError,
  loadCliBridgeFromGlobal,
} from "./cli-bridge";

const writeTextFile = async (
  filePath: string,
  content: string
): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
};

const createGeminiFixture = async (options: {
  readonly fastUriMode: "broken" | "missing" | "valid";
  readonly includeLegacyExecutor: boolean;
  readonly includeThoughtUtils: boolean;
  readonly layout?: "bundle" | "legacy";
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

  if (options.layout !== "bundle") {
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
  }
  if (options.layout === "bundle") {
    await writeTextFile(
      path.join(cliCoreRoot, "dist", "src", "config", "config.js"),
      [
        "export const DEFAULT_GEMINI_FLASH_MODEL = 'gemini-2.5-flash';",
        "export class Config {",
        "  constructor(params) {",
        "    this.params = params;",
        "  }",
        "  async refreshAuth() {}",
        "  async initialize() {}",
        "  getGeminiClient() {",
        "    return {};",
        "  }",
        "  getSessionId() {",
        "    return this.params.sessionId;",
        "  }",
        "}",
        "",
      ].join("\n")
    );
  }
  await writeTextFile(
    path.join(cliCoreRoot, "dist", "src", "core", "contentGenerator.js"),
    "export const AuthType = { LOGIN_WITH_GOOGLE: 'login_with_google' };\n"
  );
  if (options.layout === "bundle") {
    await writeTextFile(
      path.join(cliCoreRoot, "dist", "src", "scheduler", "scheduler.js"),
      [
        "export class Scheduler {",
        "  constructor(_options) {}",
        "  async schedule(request) {",
        "    const requests = Array.isArray(request) ? request : [request];",
        "    return requests.map((entry) => ({",
        "      status: 'success',",
        "      request: entry,",
        "      response: {",
        "        callId: entry.callId,",
        "        responseParts: [],",
        "        resultDisplay: 'ok',",
        "        error: undefined,",
        "        errorType: undefined,",
        "        contentLength: 2,",
        "      },",
        "    }));",
        "  }",
        "}",
        "",
      ].join("\n")
    );
  } else {
    await writeTextFile(
      path.join(cliCoreRoot, "dist", "src", "core", "coreToolScheduler.js"),
      "export class CoreToolScheduler { constructor(_options) {} async schedule() {} }\n"
    );
  }
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
  if (options.fastUriMode !== "missing") {
    await writeTextFile(
      path.join(cliCoreRoot, "node_modules", "fast-uri", "package.json"),
      JSON.stringify(
        {
          name: "fast-uri",
          version: "3.1.0-fixture",
          main: "index.js",
          type: "commonjs",
        },
        null,
        2
      )
    );
    await writeTextFile(
      path.join(cliCoreRoot, "node_modules", "fast-uri", "index.js"),
      "module.exports = require('./lib/schemes.js');\n"
    );
    await writeTextFile(
      path.join(cliCoreRoot, "node_modules", "fast-uri", "lib", "schemes.js"),
      options.fastUriMode === "broken"
        ? "'use strict'\n/**"
        : "module.exports = { http: {}, https: {} };\n"
    );
  }

  return {
    root: fixtureRoot,
    cliRoot,
  };
};

test("loadCliBridgeFromGlobal supports bundle-only Gemini CLI layouts", async () => {
  const fixture = await createGeminiFixture({
    fastUriMode: "valid",
    includeLegacyExecutor: false,
    includeThoughtUtils: true,
    layout: "bundle",
  });
  const previousRoot = process.env.CODEAI_HUB_GEMINI_CLI_ROOT;
  process.env.CODEAI_HUB_GEMINI_CLI_ROOT = fixture.cliRoot;
  try {
    const bridge = await loadCliBridgeFromGlobal();
    const workspacePath = path.join(fixture.root, "workspace");
    await writeTextFile(
      path.join(workspacePath, ".gemini", "settings.json"),
      JSON.stringify(
        {
          security: {
            auth: {
              selectedType: "login_with_google",
            },
          },
        },
        null,
        2
      )
    );
    const settings = bridge.modules.settings.loadSettings(workspacePath);
    assert.equal(
      settings.merged?.security?.auth?.selectedType,
      "login_with_google"
    );

    const config = await bridge.modules.config.loadCliConfig(
      settings.merged,
      "bundle-session",
      {
        approvalMode: "yolo",
        includeDirectories: [workspacePath],
        listExtensions: false,
        listSessions: false,
      } as Parameters<typeof bridge.modules.config.loadCliConfig>[2],
      workspacePath
    );
    assert.equal(config.getSessionId(), "bundle-session");

    const completedCalls: unknown[][] = [];
    const Scheduler = bridge.modules.toolScheduler
      .CoreToolScheduler as unknown as new (options: {
      readonly context: Record<string, unknown>;
      readonly getPreferredEditor: () => undefined;
      readonly onAllToolCallsComplete: (
        calls: readonly unknown[]
      ) => void | Promise<void>;
    }) => {
      schedule(
        request: Parameters<
          (typeof bridge.modules.toolScheduler.CoreToolScheduler.prototype)["schedule"]
        >[0],
        signal: AbortSignal
      ): Promise<void>;
    };
    const scheduler = new Scheduler({
      context: {
        config,
        messageBus: {},
        promptId: "prompt-1",
        toolRegistry: {},
      },
      getPreferredEditor: () => undefined,
      onAllToolCallsComplete: (calls: readonly unknown[]) => {
        completedCalls.push([...calls]);
      },
    });

    await scheduler.schedule(
      {
        args: {},
        callId: "call-1",
        isClientInitiated: false,
        name: "shell",
        prompt_id: "prompt-1",
      } as Parameters<
        (typeof bridge.modules.toolScheduler.CoreToolScheduler.prototype)["schedule"]
      >[0],
      new AbortController().signal
    );

    assert.equal(completedCalls.length, 1);
    assert.equal(
      (
        completedCalls[0]?.[0] as {
          request?: { callId?: string };
        }
      ).request?.callId,
      "call-1"
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

test("loadCliBridgeFromGlobal loads modules without legacy executor", async () => {
  const fixture = await createGeminiFixture({
    fastUriMode: "valid",
    includeLegacyExecutor: false,
    includeThoughtUtils: true,
    layout: "legacy",
  });
  const previousRoot = process.env.CODEAI_HUB_GEMINI_CLI_ROOT;
  process.env.CODEAI_HUB_GEMINI_CLI_ROOT = fixture.cliRoot;
  try {
    const bridge = await loadCliBridgeFromGlobal();
    assert.ok(bridge.modules.toolScheduler);
    assert.ok(bridge.metadata.cliCore);
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
    fastUriMode: "valid",
    includeLegacyExecutor: false,
    includeThoughtUtils: false,
    layout: "legacy",
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

test("loadCliBridgeFromGlobal wraps broken fast-uri dependency as compatibility error", async () => {
  const fixture = await createGeminiFixture({
    fastUriMode: "broken",
    includeLegacyExecutor: false,
    includeThoughtUtils: true,
    layout: "legacy",
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
