import {
  type ClaudeHaikuTranslationService,
  ClaudeProviderAdapter,
} from "@codeai-hub/claude-module";
import {
  LocalizationFacade,
  type LocalizationFacadeOptions,
} from "@codeai-hub/localization";
import type { TranslationReporter } from "@codeai-hub/translation";
import type { CoreConfig } from "../config";
import { CLAUDE_INSTALLER_PATHS } from "../provider-registry/provider-installer-paths";
import { resolveWorkspaceRuntimeCapsule } from "../workflow/runtime/workspace-runtime-capsule";
import { createCoreTranslationFacade } from "./core-translation-facade-factory";

export interface CoreLocalizationFacadeFactoryOptions
  extends LocalizationFacadeOptions {
  readonly claudeHaikuTranslationService?: ClaudeHaikuTranslationService;
  readonly config?: CoreConfig;
  readonly translationReporter?: TranslationReporter;
}

interface SharedClaudeLocalizationServiceEntry {
  readonly configKey: string;
  readonly service: ClaudeHaikuTranslationService;
}

let sharedClaudeLocalizationServiceEntry: SharedClaudeLocalizationServiceEntry | null =
  null;

const resolveSettingsPath = (config: CoreConfig): string =>
  resolveWorkspaceRuntimeCapsule({
    workspaceRoot: config.claudeWorkspacePath ?? process.cwd(),
    workspaceSlug: config.claudeProjectSlug,
  }).settingsFile.absolutePath;

const resolveLocalizationRootDirectory = (config: CoreConfig): string =>
  resolveWorkspaceRuntimeCapsule({
    workspaceRoot: config.claudeWorkspacePath ?? process.cwd(),
    workspaceSlug: config.claudeProjectSlug,
  }).localizationRoot.absolutePath;

const buildConfigKey = (config: CoreConfig): string =>
  JSON.stringify({
    claudeDefaultModel: config.claudeDefaultModel,
    claudeProjectSlug: config.claudeProjectSlug,
    claudeSettingsPath: resolveSettingsPath(config),
    claudeWorkspacePath: config.claudeWorkspacePath ?? process.cwd(),
    localizationRootDirectory: resolveLocalizationRootDirectory(config),
  });

const resolveSharedClaudeHaikuTranslationService = (
  config?: CoreConfig
): ClaudeHaikuTranslationService | undefined => {
  if (!config) {
    return undefined;
  }
  const configKey = buildConfigKey(config);
  if (sharedClaudeLocalizationServiceEntry?.configKey === configKey) {
    return sharedClaudeLocalizationServiceEntry.service;
  }
  const workspacePath = config.claudeWorkspacePath ?? process.cwd();
  const adapter = new ClaudeProviderAdapter({
    installerPaths: CLAUDE_INSTALLER_PATHS,
    workspace: {
      claudeProjectSlug: config.claudeProjectSlug,
      defaultModel: config.claudeDefaultModel,
      settingsPath: resolveSettingsPath(config),
      workspacePath,
    },
  });
  const service = adapter.getHaikuTranslationService();
  sharedClaudeLocalizationServiceEntry = {
    configKey,
    service,
  };
  return service;
};

export const createCoreLocalizationFacade = (
  options: CoreLocalizationFacadeFactoryOptions = {}
): LocalizationFacade => {
  const {
    claudeHaikuTranslationService,
    config,
    translationReporter,
    translationFacade,
    ...localizationOptions
  } = options;
  const resolvedClaudeHaikuTranslationService =
    claudeHaikuTranslationService ??
    resolveSharedClaudeHaikuTranslationService(config);
  const coreTranslationFacade =
    translationFacade ??
    createCoreTranslationFacade({
      claudeHaikuTranslationService: resolvedClaudeHaikuTranslationService,
      reporter: translationReporter,
    });
  return new LocalizationFacade({
    ...localizationOptions,
    localizationRootDirectory:
      localizationOptions.localizationRootDirectory ??
      (config ? resolveLocalizationRootDirectory(config) : undefined),
    translationFacade: coreTranslationFacade,
  });
};
