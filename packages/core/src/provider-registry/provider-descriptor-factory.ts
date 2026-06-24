import path from "node:path";
import type { ModuleReporter } from "@codeai-hub/claude-module";
import type { KimiModuleOptions } from "@codeai-hub/kimi-module";
import type { CoreConfig } from "../config";
import { loadKimiSettingsSnapshot } from "../config/provider-settings-snapshot";
import { LocalModelsProviderAdapter } from "../local-models/local-models-provider-adapter";
import { OpenRouterProviderAdapter } from "../open-router/open-router-provider-adapter";
import { resolveWorkspaceRuntimeCapsule } from "../workflow/runtime/workspace-runtime-capsule";
import {
  CLAUDE_INSTALLER_PATHS,
  CODEX_INSTALLER_PATHS,
} from "./provider-installer-paths";
import type {
  ClaudeAdapterCtor,
  CodexAdapterCtor,
  GlmAdapterCtor,
  GlmOpenCodeAdapterCtor,
  MutableProviderDescriptor,
  ProviderAdapter,
  ProviderDescriptor,
  ProviderModelSyncCapabilities,
} from "./provider-module-loader.types";
import {
  createClaudeUsageLimitsFacadeBridge,
  createCodexUsageLimitsFacadeBridge,
} from "./provider-usage-limits-bridge-factory";

interface ProviderDescriptorFactoryOptions {
  readonly claudeAdapterCtor: ClaudeAdapterCtor;
  readonly codexAdapterCtor: CodexAdapterCtor;
  readonly config: CoreConfig;
  readonly createReporter: (scope: string) => ModuleReporter;
  readonly glmAdapterCtor: GlmAdapterCtor;
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
  kimiCode: {
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
  glmNative: {
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
  openRouter: {
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
  glmNative: true,
  kimiCode: true,
  glmOpenCode: true,
  localModels: true,
  openRouter: true,
};

const CODEX_WORKFLOW_DEFAULT_APPROVAL_MODE = "never";
const CODEX_WORKFLOW_DEFAULT_SANDBOX_MODE = "danger-full-access";

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
): ProviderAdapter => {
  const capsule = resolveWorkspaceRuntimeCapsuleForConfig(options.config);
  const kimiSnapshot = loadKimiSettingsSnapshot(
    capsule.settingsFile.absolutePath
  );
  return new options.kimiAdapterCtor({
    workspace: {
      workspacePath: options.config.claudeWorkspacePath ?? process.cwd(),
      defaultModel:
        typeof kimiSnapshot?.defaultModel === "string"
          ? kimiSnapshot.defaultModel
          : (options.config.kimiDefaultModel ?? "kimi-k2.7-code"),
      thinkingEnabled: true,
    },
    reporter: options.createReporter("kimi"),
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
      defaultModel: "zai-coding-plan/glm-5.2",
      providerHomePath: path.join(
        capsule.providersRoot.absolutePath,
        "opencode",
        "home"
      ),
      settingsPath: capsule.settingsFile.absolutePath,
      workspacePath: options.config.claudeWorkspacePath ?? process.cwd(),
    },
    reporter: options.createReporter("opencode"),
  });
};

export const createGlmAdapterInstance = (
  options: Pick<
    ProviderDescriptorFactoryOptions,
    "config" | "createReporter" | "glmAdapterCtor"
  >
): ProviderAdapter => {
  const capsule = resolveWorkspaceRuntimeCapsuleForConfig(options.config);
  return new options.glmAdapterCtor({
    workspace: {
      defaultModel: "glm-5.2",
      providerHomePath: capsule.providerHomes["glm-native"].absolutePath,
      settingsPath: capsule.settingsFile.absolutePath,
      workspacePath: options.config.claudeWorkspacePath ?? process.cwd(),
    },
    reporter: options.createReporter("glm"),
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
    name: "OpenCode",
    description: "Uses OpenCode CLI providers and models",
    status: "active",
  };
  tryAttachAdapter(
    () => createGlmOpenCodeAdapterInstance(options),
    descriptor,
    "OpenCode wrapper components are unavailable.",
    options.handleAdapterConstructionFailure
  );
  return descriptor;
};

const buildGlmDescriptor = (
  options: ProviderDescriptorFactoryOptions
): ProviderDescriptor => {
  const descriptor: MutableProviderDescriptor = {
    capabilities: {
      modelSync: resolveProviderModelSyncCapabilities("glmNative"),
      requiresPostStopResume: false,
      supportsImmediateBinding:
        resolveProviderImmediateBindingCapability("glmNative"),
    },
    id: "glmNative",
    name: "GLM",
    description: "Uses the native Z.AI GLM API",
    status: "active",
  };
  tryAttachAdapter(
    () => createGlmAdapterInstance(options),
    descriptor,
    "GLM native API components are unavailable.",
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

const buildOpenRouterDescriptor = (): ProviderDescriptor => ({
  adapter: new OpenRouterProviderAdapter(),
  capabilities: {
    modelSync: resolveProviderModelSyncCapabilities("openRouter"),
    requiresPostStopResume: false,
    supportsImmediateBinding:
      resolveProviderImmediateBindingCapability("openRouter"),
  },
  id: "openRouter",
  name: "OpenRouter",
  description: "Uses the OpenRouter API with the selected model slug",
  status: "active",
});

export const createProviderDescriptors = (
  options: ProviderDescriptorFactoryOptions
): ProviderDescriptor[] => [
  buildClaudeDescriptor(options),
  buildCodexDescriptor(options),
  buildKimiDescriptor(options),
  buildGlmDescriptor(options),
  buildGlmOpenCodeDescriptor(options),
  buildLocalModelsDescriptor(),
  buildOpenRouterDescriptor(),
];
