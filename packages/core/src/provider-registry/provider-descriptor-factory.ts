import path from "node:path";
import type { ModuleReporter } from "@codeai-hub/claude-module";
import type { KimiModuleOptions } from "@codeai-hub/kimi-module";
import type { CoreConfig } from "../config";
import { LocalModelsProviderAdapter } from "../local-models/local-models-provider-adapter";
import { resolveWorkspaceRuntimeCapsule } from "../workflow/runtime/workspace-runtime-capsule";
import {
  CLAUDE_INSTALLER_PATHS,
  CODEX_INSTALLER_PATHS,
  GEMINI_INSTALLER_PATHS,
} from "./provider-installer-paths";
import type {
  ClaudeAdapterCtor,
  CodexAdapterCtor,
  GeminiAdapterCtor,
  GlmClaudeCodeAdapterCtor,
  GlmOpenCodeAdapterCtor,
  MutableProviderDescriptor,
  ProviderAdapter,
  ProviderDescriptor,
  ProviderModelSyncCapabilities,
} from "./provider-module-loader.types";
import {
  createClaudeUsageLimitsFacadeBridge,
  createCodexUsageLimitsFacadeBridge,
  createGeminiUsageLimitsFacadeBridge,
} from "./provider-usage-limits-bridge-factory";

interface ProviderDescriptorFactoryOptions {
  readonly claudeAdapterCtor: ClaudeAdapterCtor;
  readonly codexAdapterCtor: CodexAdapterCtor;
  readonly config: CoreConfig;
  readonly createReporter: (scope: string) => ModuleReporter;
  readonly glmClaudeCodeAdapterCtor: GlmClaudeCodeAdapterCtor;
  readonly glmOpenCodeAdapterCtor: GlmOpenCodeAdapterCtor;
  readonly handleAdapterConstructionFailure: (
    descriptor: MutableProviderDescriptor,
    error: unknown,
    failureLabel: string
  ) => void;
  readonly kimiAdapterCtor: KimiAdapterCtor;
}

export type KimiAdapterCtor = new (
  options: KimiModuleOptions
) => ProviderAdapter;

interface GeminiAdapterFactoryOptions {
  readonly adapterCtor: GeminiAdapterCtor;
  readonly config: CoreConfig;
  readonly createReporter: (scope: string) => ModuleReporter;
  readonly credentialsDirectory?: string;
  readonly defaultModel?: string;
  readonly settingsPath: string;
  readonly thinkingLevelByModel: Record<string, string>;
  readonly workspacePath: string;
}

const tryAttachAdapter = (
  factory: () => ProviderAdapter,
  descriptor: MutableProviderDescriptor,
  failureLabel: string,
  onFailure: ProviderDescriptorFactoryOptions["handleAdapterConstructionFailure"]
): void => {
  try {
    descriptor.adapter = factory();
  } catch (error) {
    onFailure(descriptor, error, failureLabel);
  }
};

const DEFAULT_PROVIDER_MODEL_SYNC_CAPABILITIES: ProviderModelSyncCapabilities =
  {
    acceptsAppliedTurnConfig: false,
    appliedConfigIdentityKey: "effective_model_id",
    runtimeModelSelectionKey: "base_model_id",
    syncsLabelFromAppliedConfig: false,
  };

const PROVIDER_MODEL_SYNC_CAPABILITIES: Readonly<
  Record<string, ProviderModelSyncCapabilities>
> = {
  claudeCodeCli: {
    acceptsAppliedTurnConfig: true,
    appliedConfigIdentityKey: "effective_model_id",
    runtimeModelSelectionKey: "base_model_id",
    syncsLabelFromAppliedConfig: true,
  },
  codexCli: {
    acceptsAppliedTurnConfig: true,
    appliedConfigIdentityKey: "effective_model_id",
    runtimeModelSelectionKey: "base_model_id",
    syncsLabelFromAppliedConfig: true,
  },
  geminiCli: {
    acceptsAppliedTurnConfig: true,
    appliedConfigIdentityKey: "effective_model_id",
    runtimeModelSelectionKey: "base_model_id",
    syncsLabelFromAppliedConfig: true,
  },
  kimiCode: {
    acceptsAppliedTurnConfig: true,
    appliedConfigIdentityKey: "effective_model_id",
    runtimeModelSelectionKey: "base_model_id",
    syncsLabelFromAppliedConfig: true,
  },
  glmClaudeCode: {
    acceptsAppliedTurnConfig: true,
    appliedConfigIdentityKey: "effective_model_id",
    runtimeModelSelectionKey: "base_model_id",
    syncsLabelFromAppliedConfig: true,
  },
  glmOpenCode: {
    acceptsAppliedTurnConfig: true,
    appliedConfigIdentityKey: "effective_model_id",
    runtimeModelSelectionKey: "base_model_id",
    syncsLabelFromAppliedConfig: true,
  },
  localModels: {
    acceptsAppliedTurnConfig: true,
    appliedConfigIdentityKey: "effective_model_id",
    runtimeModelSelectionKey: "base_model_id",
    syncsLabelFromAppliedConfig: true,
  },
};

export const resolveProviderModelSyncCapabilities = (
  providerId: string
): ProviderModelSyncCapabilities =>
  PROVIDER_MODEL_SYNC_CAPABILITIES[providerId] ??
  DEFAULT_PROVIDER_MODEL_SYNC_CAPABILITIES;

const PROVIDER_IMMEDIATE_BINDING_CAPABILITIES: Readonly<
  Record<string, boolean>
> = {
  claudeCodeCli: false,
  codexCli: false,
  geminiCli: true,
  kimiCode: true,
  glmClaudeCode: false,
  glmOpenCode: true,
  localModels: true,
};

const CODEX_WORKFLOW_DEFAULT_APPROVAL_MODE = "never";
const CODEX_WORKFLOW_DEFAULT_SANDBOX_MODE = "danger-full-access";
const GLM_OPENCODE_CONFIG_PATH =
  "~/.codeai-hub/providers/glm-opencode/config.json";
const GLM_CLAUDE_CODE_WORKSPACE_SETTINGS_PATH_ENV =
  "CODEAI_GLM_CLAUDE_CODE_WORKSPACE_SETTINGS_PATH";

const resolveWorkspaceSettingsPath = (config: CoreConfig): string =>
  resolveWorkspaceRuntimeCapsule({
    workspaceRoot: config.claudeWorkspacePath ?? process.cwd(),
    workspaceSlug: config.claudeProjectSlug,
  }).settingsFile.absolutePath;

const resolveWorkspaceRuntimeCapsuleForConfig = (config: CoreConfig) =>
  resolveWorkspaceRuntimeCapsule({
    workspaceRoot: config.claudeWorkspacePath ?? process.cwd(),
    workspaceSlug: config.claudeProjectSlug,
  });

export const resolveProviderImmediateBindingCapability = (
  providerId: string
): boolean => PROVIDER_IMMEDIATE_BINDING_CAPABILITIES[providerId] === true;

export const createClaudeAdapterInstance = (
  options: Pick<
    ProviderDescriptorFactoryOptions,
    "claudeAdapterCtor" | "config" | "createReporter"
  >
): ProviderAdapter =>
  new options.claudeAdapterCtor({
    installerPaths: CLAUDE_INSTALLER_PATHS,
    usageLimitsFacade: createClaudeUsageLimitsFacadeBridge(),
    workspace: {
      workspacePath: options.config.claudeWorkspacePath ?? process.cwd(),
      claudeProjectSlug: options.config.claudeProjectSlug,
      settingsPath: resolveWorkspaceSettingsPath(options.config),
      defaultModel: options.config.claudeDefaultModel,
    },
    reporter: options.createReporter("claude"),
  });

export const createCodexAdapterInstance = (
  options: Pick<
    ProviderDescriptorFactoryOptions,
    "codexAdapterCtor" | "config" | "createReporter"
  >
): ProviderAdapter => {
  const {
    codexWorkspacePath,
    codexSandboxMode,
    codexApprovalMode,
    codexDefaultModel,
    codexDefaultReasoningEffort,
    codexSkipGitRepoCheck,
  } = options.config;

  return new options.codexAdapterCtor({
    installerPaths: CODEX_INSTALLER_PATHS,
    usageLimitsFacade: createCodexUsageLimitsFacadeBridge(),
    workspace: {
      workspacePath: codexWorkspacePath ?? process.cwd(),
      defaultSandboxMode:
        codexSandboxMode ?? CODEX_WORKFLOW_DEFAULT_SANDBOX_MODE,
      defaultApprovalMode:
        codexApprovalMode ?? CODEX_WORKFLOW_DEFAULT_APPROVAL_MODE,
      defaultModel: codexDefaultModel,
      defaultReasoningEffort: codexDefaultReasoningEffort,
      skipGitRepoCheck: codexSkipGitRepoCheck,
    },
    reporter: options.createReporter("codex"),
  });
};

export const createKimiAdapterInstance = (
  options: Pick<
    ProviderDescriptorFactoryOptions,
    "config" | "createReporter" | "kimiAdapterCtor"
  >
): ProviderAdapter =>
  new options.kimiAdapterCtor({
    workspace: {
      workspacePath: options.config.claudeWorkspacePath ?? process.cwd(),
      defaultModel: options.config.kimiDefaultModel ?? "kimi-k2.7-code",
    },
    reporter: options.createReporter("kimi"),
  });

export const createGlmClaudeCodeAdapterInstance = (
  options: Pick<
    ProviderDescriptorFactoryOptions,
    "config" | "createReporter" | "glmClaudeCodeAdapterCtor"
  >
): ProviderAdapter => {
  const capsule = resolveWorkspaceRuntimeCapsuleForConfig(options.config);
  process.env[GLM_CLAUDE_CODE_WORKSPACE_SETTINGS_PATH_ENV] =
    capsule.settingsFile.absolutePath;

  return new options.glmClaudeCodeAdapterCtor({
    installerPaths: CLAUDE_INSTALLER_PATHS,
    workspace: {
      workspacePath: options.config.claudeWorkspacePath ?? process.cwd(),
      defaultModel: "glm-5.2",
      glmClaudeProjectSlug: `${capsule.workspaceSlug}-glm-claude-code`,
      providerHome: capsule.providerHomes["glm-claude-code"].absolutePath,
      settingsPath: capsule.settingsFile.absolutePath,
    },
    reporter: options.createReporter("glm-claude-code"),
  });
};

export const createGlmOpenCodeAdapterInstance = (
  options: Pick<
    ProviderDescriptorFactoryOptions,
    "config" | "createReporter" | "glmOpenCodeAdapterCtor"
  >
): ProviderAdapter => {
  const capsule = resolveWorkspaceRuntimeCapsuleForConfig(options.config);
  return new options.glmOpenCodeAdapterCtor({
    workspace: {
      configPath: GLM_OPENCODE_CONFIG_PATH,
      defaultModel: "glm-5.2",
      providerHomePath: path.join(
        capsule.providersRoot.absolutePath,
        "glm-opencode",
        "home"
      ),
      workspacePath: options.config.claudeWorkspacePath ?? process.cwd(),
    },
    reporter: options.createReporter("glm-opencode"),
  });
};

const buildClaudeDescriptor = (
  options: ProviderDescriptorFactoryOptions
): ProviderDescriptor => {
  const descriptor: MutableProviderDescriptor = {
    capabilities: {
      modelSync: resolveProviderModelSyncCapabilities("claudeCodeCli"),
      requiresPostStopResume: false,
      supportsImmediateBinding:
        resolveProviderImmediateBindingCapability("claudeCodeCli"),
    },
    id: "claudeCodeCli",
    name: "Claude",
    description: "Using your authentication Claude Code CLI",
    status: "active",
  };
  tryAttachAdapter(
    () => createClaudeAdapterInstance(options),
    descriptor,
    "Claude CLI components are unavailable.",
    options.handleAdapterConstructionFailure
  );
  return descriptor;
};

const buildCodexDescriptor = (
  options: ProviderDescriptorFactoryOptions
): ProviderDescriptor => {
  const descriptor: MutableProviderDescriptor = {
    capabilities: {
      modelSync: resolveProviderModelSyncCapabilities("codexCli"),
      requiresPostStopResume: false,
      supportsImmediateBinding:
        resolveProviderImmediateBindingCapability("codexCli"),
    },
    id: "codexCli",
    name: "Codex",
    description: "Using your authentication Codex CLI",
    status: "active",
  };
  tryAttachAdapter(
    () => createCodexAdapterInstance(options),
    descriptor,
    "Codex CLI components are unavailable.",
    options.handleAdapterConstructionFailure
  );
  return descriptor;
};

const buildGeminiDescriptor = (): ProviderDescriptor => ({
  capabilities: {
    modelSync: resolveProviderModelSyncCapabilities("geminiCli"),
    requiresPostStopResume: true,
    supportsImmediateBinding:
      resolveProviderImmediateBindingCapability("geminiCli"),
  },
  id: "geminiCli",
  name: "Gemini",
  description: "Using your authentication Gemini CLI",
  status: "active",
});

const buildKimiDescriptor = (
  options: ProviderDescriptorFactoryOptions
): ProviderDescriptor => {
  const descriptor: MutableProviderDescriptor = {
    capabilities: {
      modelSync: resolveProviderModelSyncCapabilities("kimiCode"),
      requiresPostStopResume: false,
      supportsImmediateBinding:
        resolveProviderImmediateBindingCapability("kimiCode"),
    },
    id: "kimiCode",
    name: "Kimi",
    description: "Using your authentication Kimi Code CLI",
    status: "active",
  };
  tryAttachAdapter(
    () => createKimiAdapterInstance(options),
    descriptor,
    "Kimi CLI components are unavailable.",
    options.handleAdapterConstructionFailure
  );
  return descriptor;
};

const buildGlmClaudeCodeDescriptor = (
  options: ProviderDescriptorFactoryOptions
): ProviderDescriptor => {
  const descriptor: MutableProviderDescriptor = {
    capabilities: {
      modelSync: resolveProviderModelSyncCapabilities("glmClaudeCode"),
      requiresPostStopResume: false,
      supportsImmediateBinding:
        resolveProviderImmediateBindingCapability("glmClaudeCode"),
    },
    id: "glmClaudeCode",
    name: "GLM-Claude-Code",
    description:
      "Requires separate Z.AI/GLM API key; runs GLM 5.2 through Claude Agent SDK-compatible runtime",
    status: "active",
  };
  tryAttachAdapter(
    () => createGlmClaudeCodeAdapterInstance(options),
    descriptor,
    "GLM-Claude-Code components are unavailable.",
    options.handleAdapterConstructionFailure
  );
  return descriptor;
};

const buildGlmOpenCodeDescriptor = (
  options: ProviderDescriptorFactoryOptions
): ProviderDescriptor => {
  const descriptor: MutableProviderDescriptor = {
    capabilities: {
      modelSync: resolveProviderModelSyncCapabilities("glmOpenCode"),
      requiresPostStopResume: false,
      supportsImmediateBinding:
        resolveProviderImmediateBindingCapability("glmOpenCode"),
    },
    id: "glmOpenCode",
    name: "GLM-OpenCode",
    description:
      "Requires separate Z.AI/GLM API key; runs GLM 5.2 through OpenCode",
    status: "active",
  };
  tryAttachAdapter(
    () => createGlmOpenCodeAdapterInstance(options),
    descriptor,
    "GLM-OpenCode components are unavailable.",
    options.handleAdapterConstructionFailure
  );
  return descriptor;
};

const buildLocalModelsDescriptor = (): ProviderDescriptor => ({
  adapter: new LocalModelsProviderAdapter(),
  capabilities: {
    modelSync: resolveProviderModelSyncCapabilities("localModels"),
    requiresPostStopResume: false,
    supportsImmediateBinding:
      resolveProviderImmediateBindingCapability("localModels"),
  },
  id: "localModels",
  name: "Local Models",
  description: "Runs downloaded LM Studio models on this Mac",
  status: "active",
});

export const createProviderDescriptors = (
  options: ProviderDescriptorFactoryOptions
): ProviderDescriptor[] => [
  buildClaudeDescriptor(options),
  buildCodexDescriptor(options),
  buildGeminiDescriptor(),
  buildKimiDescriptor(options),
  buildGlmClaudeCodeDescriptor(options),
  buildGlmOpenCodeDescriptor(options),
  buildLocalModelsDescriptor(),
];

export const createGeminiAdapterInstance = (
  options: GeminiAdapterFactoryOptions
): ProviderAdapter => {
  const credentials = options.credentialsDirectory
    ? {
        directory: options.credentialsDirectory,
        requiredFiles: ["oauth_creds.json", "credentials.json"],
      }
    : {
        requiredFiles: ["oauth_creds.json", "credentials.json"],
      };

  return new options.adapterCtor({
    installerPaths: GEMINI_INSTALLER_PATHS,
    workspace: {
      workspacePath: options.workspacePath,
      defaultModel: options.defaultModel,
      thinkingLevelByModel: options.thinkingLevelByModel,
      settingsPath: options.settingsPath,
    },
    reporter: options.createReporter("gemini"),
    credentials,
    usageLimitsFacade: createGeminiUsageLimitsFacadeBridge(),
  });
};
