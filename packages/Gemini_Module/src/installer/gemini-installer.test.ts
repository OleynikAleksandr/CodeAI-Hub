import assert from "node:assert/strict";
import test from "node:test";
import { GeminiInstaller } from "./gemini-installer";

const createInstaller = (): GeminiInstaller =>
  new GeminiInstaller(
    {
      linux: "~/.npm-global/lib/node_modules/@google/gemini-cli",
      macOS: "~/.npm-global/lib/node_modules/@google/gemini-cli",
      windows: "%USERPROFILE%/.npm-global/node_modules/@google/gemini-cli",
    },
    {}
  );

const createExpectedBridge = () => ({
  metadata: {
    version: "0.35.3",
    preparedAt: new Date().toISOString(),
    source: "global",
    cli: {
      package: "@google/gemini-cli",
      resolvedVersion: "0.35.3",
    },
    cliCore: {
      package: "@google/gemini-cli-core",
      version: "0.35.3",
    },
  },
  modules: {},
});

const installBaseStubs = (
  installer: GeminiInstaller,
  steps: string[]
): void => {
  (installer as unknown as Record<string, unknown>).ensureCliPrefixDirectories =
    async () => {
      await Promise.resolve();
    };
  (installer as unknown as Record<string, unknown>).ensurePackageInstalled =
    async (_packageName: string, kind: "cli" | "core") => {
      await Promise.resolve();
      steps.push(`ensure:${kind}`);
      if (kind === "cli") {
        (installer as unknown as Record<string, unknown>).currentCliVersion =
          "0.35.3";
      } else {
        (installer as unknown as Record<string, unknown>).currentCoreVersion =
          "0.35.3";
      }
    };
  (installer as unknown as Record<string, unknown>).verifyCliExecutable =
    async () => {
      await Promise.resolve();
    };
  (installer as unknown as Record<string, unknown>).installPackage = async (
    _packageName: string,
    version: string,
    kind: "cli" | "core"
  ) => {
    await Promise.resolve();
    steps.push(`install:${kind}:${version}`);
  };
};

test("GeminiInstaller retries reinstall after compatibility error", async () => {
  const installer = createInstaller();
  const steps: string[] = [];
  installBaseStubs(installer, steps);
  (
    installer as unknown as Record<string, unknown>
  ).validateInstalledRuntimeIntegrity = () => undefined;

  let attempts = 0;
  const expectedBridge = createExpectedBridge();
  (installer as unknown as Record<string, unknown>).loadBridgeWithDiagnostics =
    async () => {
      await Promise.resolve();
      attempts += 1;
      steps.push(`load:${attempts}`);
      if (attempts === 1) {
        const error = new Error("broken runtime") as Error & {
          code?: string;
        };
        error.code = "GEMINI_CLI_COMPATIBILITY_ERROR";
        throw error;
      }
      return expectedBridge;
    };

  const bridge = await installer.ensureCliBridge();

  assert.equal(bridge, expectedBridge);
  assert.deepEqual(steps, [
    "ensure:core",
    "ensure:cli",
    "load:1",
    "install:core:0.35.3",
    "install:cli:0.35.3",
    "load:2",
  ]);
});

test("GeminiInstaller retries reinstall after installed runtime integrity failure", async () => {
  const installer = createInstaller();
  const steps: string[] = [];
  installBaseStubs(installer, steps);

  let integrityChecks = 0;
  (
    installer as unknown as Record<string, unknown>
  ).validateInstalledRuntimeIntegrity = () => {
    integrityChecks += 1;
    steps.push(`integrity:${integrityChecks}`);
    if (integrityChecks === 1) {
      const error = new Error("broken fast-uri") as Error & {
        code?: string;
      };
      error.code = "GEMINI_CLI_COMPATIBILITY_ERROR";
      throw error;
    }
  };

  const expectedBridge = createExpectedBridge();
  (installer as unknown as Record<string, unknown>).loadBridgeWithDiagnostics =
    async () => {
      await Promise.resolve();
      steps.push("load");
      return expectedBridge;
    };

  const bridge = await installer.ensureCliBridge();

  assert.equal(bridge, expectedBridge);
  assert.deepEqual(steps, [
    "ensure:core",
    "ensure:cli",
    "integrity:1",
    "install:core:0.35.3",
    "install:cli:0.35.3",
    "load",
  ]);
});
