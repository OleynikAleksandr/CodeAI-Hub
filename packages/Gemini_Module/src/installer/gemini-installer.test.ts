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

const installManagerStubs = (
  installer: GeminiInstaller,
  steps: string[]
): void => {
  (installer as unknown as Record<string, unknown>).bridgePackageManager = {
    prepareBridgeEnvironment: async () => {
      await Promise.resolve();
      steps.push("prepare");
    },
    getCurrentVersions: () => ({
      cliVersion: "0.35.3",
      coreVersion: "0.35.3",
    }),
    validateInstalledRuntimeIntegrity: () => undefined,
    recoverCompatibility: async () => {
      await Promise.resolve();
      steps.push("recover");
    },
    updatePackagesToLatest: async () => {
      await Promise.resolve();
      steps.push("update");
      return {
        cliVersion: "0.35.3",
        coreVersion: "0.35.3",
      };
    },
  };
};

test("GeminiInstaller retries reinstall after compatibility error", async () => {
  const installer = createInstaller();
  const steps: string[] = [];
  installManagerStubs(installer, steps);

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
  assert.deepEqual(steps, ["prepare", "load:1", "recover", "load:2"]);
});

test("GeminiInstaller retries reinstall after installed runtime integrity failure", async () => {
  const installer = createInstaller();
  const steps: string[] = [];
  installManagerStubs(installer, steps);

  let integrityChecks = 0;
  const bridgePackageManager = (installer as unknown as Record<string, unknown>)
    .bridgePackageManager as Record<string, unknown>;
  bridgePackageManager.validateInstalledRuntimeIntegrity = () => {
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
  assert.deepEqual(steps, ["prepare", "integrity:1", "recover", "load"]);
});
