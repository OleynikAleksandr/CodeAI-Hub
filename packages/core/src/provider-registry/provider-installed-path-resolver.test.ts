import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const createProviderInstall = (
  home: string,
  providerId: string,
  version: string
): string => {
  const providerRoot = path.join(home, ".codeai-hub", "providers", providerId);
  const installRoot = path.join(providerRoot, version);
  mkdirSync(path.join(installRoot, "dist"), { recursive: true });
  writeFileSync(path.join(providerRoot, "latest"), version, "utf8");
  writeFileSync(
    path.join(installRoot, "package.json"),
    JSON.stringify({ name: providerId, version }),
    "utf8"
  );
  writeFileSync(path.join(installRoot, "dist", "index.js"), "", "utf8");
  return installRoot;
};

const resolveOpenCodePathInChildProcess = (
  home: string
): string | undefined => {
  const output = execFileSync(
    process.execPath,
    [
      "-e",
      "const resolver=require('./packages/core/dist/provider-registry/provider-installed-path-resolver.js'); console.log(JSON.stringify({path: resolver.resolveGlmOpenCodeModulePath()}));",
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        GLM_OPENCODE_MODULE_PATH: "",
        HOME: home,
      },
    }
  );
  return (JSON.parse(output) as { path?: string }).path;
};

test("OpenCode module path resolves canonical opencode provider package and falls back to legacy glm-opencode", () => {
  const home = mkdtempSync(
    path.join(tmpdir(), "codeai-opencode-provider-home-")
  );
  try {
    const canonicalInstallRoot = createProviderInstall(
      home,
      "opencode",
      "1.2.999"
    );
    const legacyInstallRoot = createProviderInstall(
      home,
      "glm-opencode",
      "1.2.998"
    );

    assert.equal(resolveOpenCodePathInChildProcess(home), canonicalInstallRoot);

    rmSync(path.join(home, ".codeai-hub", "providers", "opencode"), {
      force: true,
      recursive: true,
    });
    assert.equal(resolveOpenCodePathInChildProcess(home), legacyInstallRoot);
  } finally {
    rmSync(home, { force: true, recursive: true });
  }
});
