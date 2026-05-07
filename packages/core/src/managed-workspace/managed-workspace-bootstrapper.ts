import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  createManagedWorkspaceManifest,
  MANAGED_WORKSPACE_MANIFEST_RELATIVE_PATH,
} from "./managed-workspace-manifest";
import { createManagedWorkspacePaths } from "./managed-workspace-paths";

const execFileAsync = promisify(execFile);
const GITIGNORE_PATH = ".gitignore";
const LINE_SPLIT_RE = /\r?\n/u;
const MANAGED_HOOKS_PATH = ".husky";
const TRAILING_SLASH_RE = /\/$/u;

export type ManagedWorkspaceBootstrapAction =
  | "configured_hooks_path"
  | "created_directories"
  | "initialized_git"
  | "updated_gitignore"
  | "wrote_manifest";

export interface ManagedWorkspaceBootstrapResult {
  readonly actions: readonly ManagedWorkspaceBootstrapAction[];
  readonly manifestPath: string;
  readonly workspaceRoot: string;
}

export type ManagedWorkspaceCommandRunner = (
  command: string,
  args: readonly string[],
  options: { readonly cwd: string }
) => Promise<void>;

export interface ManagedWorkspaceBootstrapperOptions {
  readonly commandRunner?: ManagedWorkspaceCommandRunner;
  readonly createdAt?: string;
}

export class ManagedWorkspaceBootstrapper {
  readonly #commandRunner: ManagedWorkspaceCommandRunner;
  readonly #createdAt: () => string;

  constructor(options: ManagedWorkspaceBootstrapperOptions = {}) {
    this.#commandRunner = options.commandRunner ?? runCommand;
    this.#createdAt = () => options.createdAt ?? new Date().toISOString();
  }

  async bootstrap(
    workspaceRoot: string
  ): Promise<ManagedWorkspaceBootstrapResult> {
    const paths = createManagedWorkspacePaths(workspaceRoot);
    const actions = new Set<ManagedWorkspaceBootstrapAction>();

    await mkdir(paths.workspaceRoot, { recursive: true });
    if (!(await pathExists(path.join(paths.workspaceRoot, ".git")))) {
      await this.#commandRunner("git", ["init"], { cwd: paths.workspaceRoot });
      actions.add("initialized_git");
    }
    await this.#commandRunner(
      "git",
      ["config", "core.hooksPath", MANAGED_HOOKS_PATH],
      {
        cwd: paths.workspaceRoot,
      }
    );
    actions.add("configured_hooks_path");

    await Promise.all([
      mkdir(paths.controlPlaneRoot.absolutePath, { recursive: true }),
      mkdir(paths.workflowCheckDirectory.absolutePath, { recursive: true }),
      mkdir(paths.workflowMigrationDirectory.absolutePath, { recursive: true }),
      ...paths.workflowRevisionDirectories.map((entry) =>
        mkdir(entry.absolutePath, { recursive: true })
      ),
      ...paths.ignoredStateDirectories.map((entry) =>
        mkdir(entry.absolutePath, { recursive: true })
      ),
      mkdir(path.dirname(paths.todoPlan.absolutePath), { recursive: true }),
    ]);
    actions.add("created_directories");

    if (await ensureGitIgnoreEntries(paths.workspaceRoot)) {
      actions.add("updated_gitignore");
    }

    const manifestPath = path.join(
      paths.workspaceRoot,
      MANAGED_WORKSPACE_MANIFEST_RELATIVE_PATH
    );
    const manifest = createManagedWorkspaceManifest({
      createdAt:
        (await readExistingManifestCreatedAt(manifestPath)) ??
        this.#createdAt(),
      paths,
    });
    if (
      await writeIfChanged(
        manifestPath,
        `${JSON.stringify(manifest, null, 2)}\n`
      )
    ) {
      actions.add("wrote_manifest");
    }

    return {
      actions: [...actions],
      manifestPath,
      workspaceRoot: paths.workspaceRoot,
    };
  }
}

const runCommand: ManagedWorkspaceCommandRunner = async (
  command,
  args,
  options
) => {
  await execFileAsync(command, [...args], { cwd: options.cwd });
};

const pathExists = async (targetPath: string): Promise<boolean> => {
  try {
    await access(targetPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const ensureGitIgnoreEntries = async (
  workspaceRoot: string
): Promise<boolean> => {
  const gitignorePath = path.join(workspaceRoot, GITIGNORE_PATH);
  const existing = await readExistingText(gitignorePath);
  const existingLines = new Set(
    existing
      .split(LINE_SPLIT_RE)
      .map((line) => line.trim().replace(TRAILING_SLASH_RE, ""))
      .filter(Boolean)
  );
  const requiredLines = [
    ".DS_Store",
    ".codeai-hub/runtime/",
    ".codeai-hub/logs/",
    ".codeai-hub/cache/",
    ".codeai-hub/*/continuity/",
    ".codeai-hub/*/diagram_modules/module-map.flow.json",
    ".codeai-hub/*/workflow/state.json",
  ];
  const missingLines = requiredLines.filter(
    (line) => !existingLines.has(line.replace(TRAILING_SLASH_RE, ""))
  );
  if (missingLines.length === 0) {
    return false;
  }

  const prefix = existing.length === 0 || existing.endsWith("\n") ? "" : "\n";
  await writeFile(
    gitignorePath,
    `${existing}${prefix}${missingLines.join("\n")}\n`,
    "utf8"
  );
  return true;
};

const readExistingText = async (targetPath: string): Promise<string> => {
  try {
    const fileStat = await stat(targetPath);
    if (!fileStat.isFile()) {
      return "";
    }
    return await readFile(targetPath, "utf8");
  } catch {
    return "";
  }
};

const writeIfChanged = async (
  targetPath: string,
  nextContent: string
): Promise<boolean> => {
  if ((await readExistingText(targetPath)) === nextContent) {
    return false;
  }
  await writeFile(targetPath, nextContent, "utf8");
  return true;
};

const readExistingManifestCreatedAt = async (
  manifestPath: string
): Promise<string | null> => {
  try {
    const parsed = JSON.parse(await readExistingText(manifestPath)) as {
      readonly createdAt?: unknown;
    };
    return typeof parsed.createdAt === "string" ? parsed.createdAt : null;
  } catch {
    return null;
  }
};
