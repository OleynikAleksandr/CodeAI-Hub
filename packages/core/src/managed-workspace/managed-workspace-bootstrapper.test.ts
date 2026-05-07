import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  ManagedWorkspaceBootstrapper,
  type ManagedWorkspaceCommandRunner,
} from "./managed-workspace-bootstrapper";

const CACHE_GITIGNORE_RE = /\.codeai-hub\/cache\//u;
const CONTINUITY_GITIGNORE_RE = /\.codeai-hub\/\*\/continuity\//u;
const DIAGRAM_LAYOUT_SIDECAR_GITIGNORE_RE =
  /\.codeai-hub\/\*\/diagram_modules\/module-map\.flow\.json/u;
const DS_STORE_GITIGNORE_RE = /^\.DS_Store$/mu;
const LOGS_GITIGNORE_RE = /\.codeai-hub\/logs\//u;
const RUNTIME_GITIGNORE_RE = /\.codeai-hub\/runtime\//u;
const WORKFLOW_STATE_GITIGNORE_RE = /\.codeai-hub\/\*\/workflow\/state\.json/u;

const createWorkspaceRoot = (): Promise<string> =>
  mkdtemp(path.join(os.tmpdir(), "managed-workspace-"));

test("ManagedWorkspaceBootstrapper creates baseline directories and manifest", async () => {
  const workspaceRoot = await createWorkspaceRoot();
  const commands: string[] = [];
  const commandRunner: ManagedWorkspaceCommandRunner = (
    command,
    args,
    options
  ) => {
    commands.push(`${command} ${args.join(" ")} ${options.cwd}`);
    return Promise.resolve();
  };

  try {
    const result = await new ManagedWorkspaceBootstrapper({
      commandRunner,
      createdAt: "2026-05-07T00:00:00.000Z",
    }).bootstrap(workspaceRoot);

    assert.equal(commands.length, 2);
    assert.equal(commands[0], `git init ${workspaceRoot}`);
    assert.equal(
      commands[1],
      `git config core.hooksPath .husky ${workspaceRoot}`
    );
    assert.equal(result.actions.includes("initialized_git"), true);
    assert.equal(result.actions.includes("configured_hooks_path"), true);
    assert.equal(result.actions.includes("updated_gitignore"), true);

    const manifest = JSON.parse(await readFile(result.manifestPath, "utf8"));
    assert.equal(manifest.schema, "codeai-managed-workspace-v1");
    assert.equal(manifest.manifestPath, ".codeai-hub/workflow/index.json");

    const gitignore = await readFile(
      path.join(workspaceRoot, ".gitignore"),
      "utf8"
    );
    assert.match(gitignore, DS_STORE_GITIGNORE_RE);
    assert.match(gitignore, RUNTIME_GITIGNORE_RE);
    assert.match(gitignore, LOGS_GITIGNORE_RE);
    assert.match(gitignore, CACHE_GITIGNORE_RE);
    assert.match(gitignore, CONTINUITY_GITIGNORE_RE);
    assert.match(gitignore, DIAGRAM_LAYOUT_SIDECAR_GITIGNORE_RE);
    assert.match(gitignore, WORKFLOW_STATE_GITIGNORE_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("ManagedWorkspaceBootstrapper is idempotent for existing gitignore entries", async () => {
  const workspaceRoot = await createWorkspaceRoot();
  const commandRunner: ManagedWorkspaceCommandRunner = () => Promise.resolve();

  try {
    const bootstrapper = new ManagedWorkspaceBootstrapper({
      commandRunner,
      createdAt: "2026-05-07T00:00:00.000Z",
    });

    await bootstrapper.bootstrap(workspaceRoot);
    const secondResult = await bootstrapper.bootstrap(workspaceRoot);
    const gitignore = await readFile(
      path.join(workspaceRoot, ".gitignore"),
      "utf8"
    );

    assert.equal(secondResult.actions.includes("updated_gitignore"), false);
    assert.equal(gitignore.split(".DS_Store").length - 1, 1);
    assert.equal(gitignore.split(".codeai-hub/runtime/").length - 1, 1);
    assert.equal(gitignore.split(".codeai-hub/*/continuity/").length - 1, 1);
    assert.equal(
      gitignore.split(".codeai-hub/*/diagram_modules/module-map.flow.json")
        .length - 1,
      1
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("ManagedWorkspaceBootstrapper preserves workflow manifest timestamp across preflight", async () => {
  const workspaceRoot = await createWorkspaceRoot();
  const commandRunner: ManagedWorkspaceCommandRunner = () => Promise.resolve();

  try {
    await new ManagedWorkspaceBootstrapper({
      commandRunner,
      createdAt: "2026-05-07T00:00:00.000Z",
    }).bootstrap(workspaceRoot);
    const secondResult = await new ManagedWorkspaceBootstrapper({
      commandRunner,
      createdAt: "2026-05-08T00:00:00.000Z",
    }).bootstrap(workspaceRoot);
    const manifest = JSON.parse(
      await readFile(
        path.join(workspaceRoot, ".codeai-hub/workflow/index.json"),
        "utf8"
      )
    );

    assert.equal(manifest.createdAt, "2026-05-07T00:00:00.000Z");
    assert.equal(secondResult.actions.includes("wrote_manifest"), false);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
