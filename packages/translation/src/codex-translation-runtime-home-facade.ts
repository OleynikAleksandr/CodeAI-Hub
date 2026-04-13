import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

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

const copyProviderArtifact = async (
  sourceHome: string,
  destinationHome: string,
  fileName: string
): Promise<void> => {
  await copyFile(
    path.join(sourceHome, fileName),
    path.join(destinationHome, fileName)
  );
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

export class CodexTranslationRuntimeHomeFacade {
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

    await copyProviderArtifact(PROVIDER_CODEX_HOME, homePath, CODEX_AUTH_FILE);
    await copyProviderArtifact(
      PROVIDER_CODEX_HOME,
      homePath,
      CODEX_MODELS_CACHE_FILE
    );

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
}
