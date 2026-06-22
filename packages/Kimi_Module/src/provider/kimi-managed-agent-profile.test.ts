import assert from "node:assert/strict";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildKimiCliEnvironment,
  ensureKimiProviderHome,
  materializeKimiManagedAgentProfile,
} from "./kimi-managed-agent-profile";

const normalizeWorkspaceRuntimeSlug = (value: string): string => {
  const normalized = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "");
  const parts = normalized.match(/[a-z0-9]+/gu);
  return parts?.join("-") ?? "workspace";
};
const KIMI_SHELL_TOOL_RE = /kimi_cli\.tools\.shell:Shell/u;
const KIMI_SHELL_ALLOWED_RE = /Use Shell only when/u;
const KIMI_SHELL_UNAVAILABLE_RE = /Shell.*intentionally unavailable/u;
const CODEX_NATIVE_IDENTITY_RE = /You are Codex, a coding agent/u;
const CODEX_NATIVE_TOOL_RE = /"name": "exec_command"/u;
const KIMI_RUNTIME_ADDENDUM_RE = /CodeAI Hub Kimi Runtime Addendum/u;

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
      path.join(homeDir, ".kimi-code", "config.toml")
    );
    assert.equal(runtime.env.KIMI_SHARE_DIR, undefined);
    assert.deepEqual(runtime.args, ["acp"]);

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
  assert.equal(runtime.env.KIMI_SHARE_DIR, undefined);
});

test("Kimi managed profile uses ACP args without legacy thinking flags", () => {
  const runtime = buildKimiCliEnvironment({
    env: { PATH: "/usr/bin" },
    providerHomePath: "/explicit/kimi/home",
    thinkingEnabled: false,
    userConfigPath: "/explicit/kimi/config.toml",
    workspacePath: "/workspace/project",
  });

  assert.deepEqual(runtime.args, ["acp"]);
  assert.equal(runtime.args.includes("--no-thinking"), false);
  assert.equal(runtime.args.includes("--thinking"), false);
});

test("Kimi managed profile prefers the installed kimi-code binary path", async () => {
  const homeDir = await mkdtemp(path.join(tmpdir(), "Kimi User Home "));
  try {
    const binDir = path.join(homeDir, ".kimi-code", "bin");
    const commandPath = path.join(binDir, "kimi");
    await mkdir(binDir, { recursive: true });
    await writeFile(commandPath, "#!/bin/sh\n", "utf8");
    await chmod(commandPath, 0o755);

    const runtime = buildKimiCliEnvironment({
      env: { PATH: "/usr/bin" },
      homeDir,
      workspacePath: "/workspace/project",
    });

    assert.equal(runtime.command, commandPath);
    assert.equal(runtime.env.PATH?.split(path.delimiter)[0], binDir);
    assert.deepEqual(runtime.args, ["acp"]);
  } finally {
    await rm(homeDir, { force: true, recursive: true });
  }
});

test("Kimi managed profile omits legacy Wire startup flags", () => {
  const runtime = buildKimiCliEnvironment({
    env: { PATH: "/usr/bin" },
    providerHomePath: "/explicit/kimi/home",
    userConfigPath: "/explicit/kimi/config.toml",
    workspacePath: "/workspace/project",
  });

  assert.equal(runtime.args.includes("--config-file"), false);
  assert.equal(runtime.args.includes("--agent-file"), false);
  assert.equal(runtime.args.includes("--work-dir"), false);
  assert.equal(runtime.args.includes("--thinking"), false);
  assert.equal(runtime.args.includes("--no-thinking"), false);
});

test("Kimi managed profile maps selected CodeAI model through KIMI_MODEL env", async () => {
  const homeDir = await mkdtemp(path.join(tmpdir(), "Kimi User Home "));
  const configPath = path.join(homeDir, ".kimi-code", "config.toml");
  try {
    await mkdir(path.dirname(configPath), { recursive: true });
    await writeFile(
      configPath,
      [
        'default_model = "kimi-for-coding"',
        "",
        "[providers.kimi-for-coding]",
        'type = "kimi"',
        'base_url = "https://api.kimi.com/coding/v1"',
        'api_key = "test-api-key"',
        "",
        "[models.kimi-for-coding]",
        'provider = "kimi-for-coding"',
        'model = "kimi-for-coding"',
        "max_context_size = 262144",
        "",
      ].join("\n"),
      "utf8"
    );

    const runtime = buildKimiCliEnvironment({
      defaultModel: "kimi-k2.7-code-highspeed",
      env: { PATH: "/usr/bin" },
      homeDir,
      userConfigPath: configPath,
      workspacePath: "/workspace/project",
    });

    assert.equal(runtime.usesEnvironmentModel, true);
    assert.equal(runtime.env.KIMI_MODEL_NAME, "kimi-k2.7-code-highspeed");
    assert.equal(runtime.env.KIMI_MODEL_API_KEY, "test-api-key");
    assert.equal(
      runtime.env.KIMI_MODEL_BASE_URL,
      "https://api.kimi.com/coding/v1"
    );
    assert.equal(
      runtime.env.KIMI_MODEL_DISPLAY_NAME,
      "Kimi K2.7 Code High Speed"
    );
    assert.deepEqual(runtime.args, ["acp"]);
  } finally {
    await rm(homeDir, { force: true, recursive: true });
  }
});

test("Kimi managed profile includes shell for managed workflow filesystem recovery", async () => {
  const providerHomePath = await mkdtemp(path.join(tmpdir(), "Kimi Profile "));

  try {
    const paths = await materializeKimiManagedAgentProfile(providerHomePath);
    const agentYaml = await readFile(paths.agentFilePath, "utf8");
    const systemPrompt = await readFile(paths.systemPromptPath, "utf8");

    assert.match(agentYaml, KIMI_SHELL_TOOL_RE);
    assert.match(systemPrompt, CODEX_NATIVE_IDENTITY_RE);
    assert.match(systemPrompt, CODEX_NATIVE_TOOL_RE);
    assert.match(systemPrompt, KIMI_RUNTIME_ADDENDUM_RE);
    assert.match(systemPrompt, KIMI_SHELL_ALLOWED_RE);
    assert.doesNotMatch(systemPrompt, KIMI_SHELL_UNAVAILABLE_RE);
  } finally {
    await rm(providerHomePath, { force: true, recursive: true });
  }
});
