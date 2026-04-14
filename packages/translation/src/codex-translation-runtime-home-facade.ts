import {
  access,
  copyFile,
  cp,
  lstat,
  mkdir,
  mkdtemp,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const LEGACY_CODEX_HOME = path.join(homedir(), ".codex");
const PROVIDER_CODEX_HOME = path.join(
  homedir(),
  ".codeai-hub",
  "providers",
  "codex",
  "home"
);
const DEFAULT_INSTRUCTIONS_FILE = "translation-instructions.md";
const DEFAULT_SANDBOX_MODE = "read-only";
const DEFAULT_REASONING_SUMMARY = "none";
const CODEX_AUTH_FILE = "auth.json";
const CODEX_MODELS_CACHE_FILE = "models_cache.json";
const OPTIONAL_BOOTSTRAP_ARTIFACTS = [
  ".tmp/app-server-remote-plugin-sync-v1",
  ".tmp/plugins",
  ".tmp/plugins.sha",
  "installation_id",
  "skills",
] as const;

const toTomlString = (value: string): string =>
  `"${value.split("\\").join("\\\\").split('"').join('\\"')}"`;

const buildConfigToml = (options: {
  readonly instructionsFilePath: string;
  readonly modelId: string;
  readonly reasoningEffort: string;
  readonly sandboxMode: string;
}): string =>
  [
    'approval_policy = "never"',
    `model = ${toTomlString(options.modelId)}`,
    `model_reasoning_effort = ${toTomlString(options.reasoningEffort)}`,
    `model_reasoning_summary = ${toTomlString(DEFAULT_REASONING_SUMMARY)}`,
    `model_instructions_file = ${toTomlString(options.instructionsFilePath)}`,
    `sandbox_mode = ${toTomlString(options.sandboxMode)}`,
    "suppress_unstable_features_warning = true",
    "",
    "[features]",
    "unified_exec = false",
    "shell_snapshot = false",
    "steer = false",
    "apps = false",
    "multi_agent = false",
    "",
  ].join("\n");

const resolveExistingArtifactPath = async (
  candidatePaths: readonly string[]
): Promise<string | null> => {
  for (const candidatePath of candidatePaths) {
    try {
      await access(candidatePath);
      return candidatePath;
    } catch {
      // Continue until an existing artifact is found.
    }
  }

  return null;
};

export interface CodexTranslationRuntimeOptions {
  readonly modelId: string;
  readonly modelInstructions: string;
  readonly reasoningEffort: string;
  readonly sandboxMode?: string;
}

export interface CodexTranslationRuntimeHandle {
  readonly cleanup: () => Promise<void>;
  readonly homePath: string;
  readonly instructionsFilePath: string;
  readonly workspacePath: string;
}

export interface CodexTranslationRuntimeHomeFacadeOptions {
  readonly legacyCodexHome?: string;
  readonly providerCodexHome?: string;
}

export class CodexTranslationRuntimeHomeFacade {
  private readonly legacyCodexHome: string;
  private readonly providerCodexHome: string;

  constructor(options: CodexTranslationRuntimeHomeFacadeOptions = {}) {
    this.legacyCodexHome = options.legacyCodexHome ?? LEGACY_CODEX_HOME;
    this.providerCodexHome = options.providerCodexHome ?? PROVIDER_CODEX_HOME;
  }

  async materialize(
    options: CodexTranslationRuntimeOptions
  ): Promise<CodexTranslationRuntimeHandle> {
    const runtimeRoot = await mkdtemp(
      path.join(process.env.TMPDIR ?? "/tmp", "codeai-codex-translation-")
    );
    const homePath = path.join(runtimeRoot, "home");
    const workspacePath = path.join(runtimeRoot, "workspace");
    await mkdir(homePath, { recursive: true });
    await mkdir(workspacePath, { recursive: true });

    await this.copyRequiredArtifact(homePath, CODEX_AUTH_FILE);
    await this.copyOptionalArtifact(homePath, CODEX_MODELS_CACHE_FILE);
    await this.reuseOptionalBootstrapArtifacts(homePath);

    const instructionsFilePath = path.join(homePath, DEFAULT_INSTRUCTIONS_FILE);
    await writeFile(
      instructionsFilePath,
      `${options.modelInstructions.trim()}\n`,
      "utf8"
    );

    await writeFile(
      path.join(homePath, "config.toml"),
      buildConfigToml({
        instructionsFilePath,
        modelId: options.modelId,
        reasoningEffort: options.reasoningEffort,
        sandboxMode: options.sandboxMode ?? DEFAULT_SANDBOX_MODE,
      }),
      "utf8"
    );

    return {
      homePath,
      instructionsFilePath,
      workspacePath,
      cleanup: async () => {
        await rm(runtimeRoot, {
          recursive: true,
          force: true,
          maxRetries: 5,
          retryDelay: 50,
        });
      },
    };
  }

  private async copyRequiredArtifact(
    destinationHome: string,
    fileName: string
  ): Promise<void> {
    const sourcePath = await this.resolveArtifactPath(fileName);
    if (!sourcePath) {
      throw new Error(`Codex translation runtime missing required ${fileName}`);
    }
    await copyFile(sourcePath, path.join(destinationHome, fileName));
  }

  private async copyOptionalArtifact(
    destinationHome: string,
    fileName: string
  ): Promise<void> {
    const sourcePath = await this.resolveArtifactPath(fileName);
    if (!sourcePath) {
      return;
    }
    await copyFile(sourcePath, path.join(destinationHome, fileName));
  }

  private resolveArtifactPath(fileName: string): Promise<string | null> {
    return resolveExistingArtifactPath([
      path.join(this.providerCodexHome, fileName),
      path.join(this.legacyCodexHome, fileName),
    ]);
  }

  private async reuseOptionalBootstrapArtifacts(
    destinationHome: string
  ): Promise<void> {
    for (const relativePath of OPTIONAL_BOOTSTRAP_ARTIFACTS) {
      await this.reuseOptionalArtifact(destinationHome, relativePath);
    }
  }

  private async reuseOptionalArtifact(
    destinationHome: string,
    relativePath: string
  ): Promise<void> {
    const sourcePath = await this.resolveArtifactPath(relativePath);
    if (!sourcePath) {
      return;
    }

    const destinationPath = path.join(destinationHome, relativePath);
    await mkdir(path.dirname(destinationPath), { recursive: true });
    const sourceStats = await lstat(sourcePath);
    const symlinkType =
      process.platform === "win32" && sourceStats.isDirectory()
        ? "junction"
        : undefined;

    try {
      await symlink(sourcePath, destinationPath, symlinkType);
    } catch {
      await cp(sourcePath, destinationPath, { recursive: true });
    }
  }
}
