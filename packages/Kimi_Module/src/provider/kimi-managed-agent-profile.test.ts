import assert from "node:assert/strict";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildKimiCliEnvironment,
  ensureKimiProviderHome,
} from "./kimi-managed-agent-profile";

const normalizeWorkspaceRuntimeSlug = (value: string): string => {
  const normalized = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "");
  const parts = normalized.match(/[a-z0-9]+/gu);
  return parts?.join("-") ?? "workspace";
};

test("Kimi managed profile resolves provider home inside workspace capsule", async () => {
  const workspacePath = await mkdtemp(path.join(tmpdir(), "Kimi Home Demo "));
  const homeDir = await mkdtemp(path.join(tmpdir(), "Kimi User Home "));

  try {
    const expectedProviderHome = path.join(
      workspacePath,
      ".codeai-hub",
      normalizeWorkspaceRuntimeSlug(path.basename(workspacePath)),
      "runtime",
      "providers",
      "kimi",
      "home"
    );
    const runtime = buildKimiCliEnvironment({
      env: { PATH: "/usr/bin" },
      homeDir,
      workspacePath,
    });

    assert.equal(runtime.runtimeHome.providerHomePath, expectedProviderHome);
    assert.equal(
      runtime.runtimeHome.userConfigPath,
      path.join(homeDir, ".kimi", "config.toml")
    );
    assert.equal(runtime.env.KIMI_SHARE_DIR, expectedProviderHome);
    assert.deepEqual(runtime.args.slice(0, 2), [
      "--config-file",
      path.join(homeDir, ".kimi", "config.toml"),
    ]);
    assert.equal(runtime.args.at(-2), "--work-dir");
    assert.equal(runtime.args.at(-1), workspacePath);

    const home = await ensureKimiProviderHome(runtime.runtimeHome);
    assert.equal(home.providerHomePath, expectedProviderHome);
    assert.equal((await stat(expectedProviderHome)).isDirectory(), true);
    assert.equal(
      (await stat(path.dirname(home.userConfigPath))).isDirectory(),
      true
    );
  } finally {
    await rm(workspacePath, { force: true, recursive: true });
    await rm(homeDir, { force: true, recursive: true });
  }
});

test("Kimi managed profile keeps explicit provider home overrides", () => {
  const runtime = buildKimiCliEnvironment({
    env: { PATH: "/usr/bin" },
    providerHomePath: "/explicit/kimi/home",
    userConfigPath: "/explicit/kimi/config.toml",
    workspacePath: "/workspace/project",
  });

  assert.equal(runtime.runtimeHome.providerHomePath, "/explicit/kimi/home");
  assert.equal(
    runtime.runtimeHome.userConfigPath,
    "/explicit/kimi/config.toml"
  );
  assert.equal(runtime.env.KIMI_SHARE_DIR, "/explicit/kimi/home");
});
