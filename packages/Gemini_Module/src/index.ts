import { GeminiProviderAdapter as GeminiProviderAdapterImpl } from "./provider/gemini-provider-adapter.js";
import type {
  GeminiCredentialsOptions as GeminiCredentialsOptionsType,
  GeminiInstallerPaths as GeminiInstallerPathsType,
  GeminiModuleOptions as GeminiModuleOptionsType,
  GeminiSessionEvent as GeminiSessionEventType,
  GeminiWorkspaceOptions as GeminiWorkspaceOptionsType,
  ModuleReporter as ModuleReporterType,
} from "./types/index.js";

const GeminiProviderAdapter = GeminiProviderAdapterImpl;
type GeminiInstallerPaths = GeminiInstallerPathsType;
type GeminiModuleOptions = GeminiModuleOptionsType;
type GeminiSessionEvent = GeminiSessionEventType;
type GeminiWorkspaceOptions = GeminiWorkspaceOptionsType;
type ModuleReporter = ModuleReporterType;
type GeminiCredentialsOptions = GeminiCredentialsOptionsType;

export { GeminiProviderAdapter };
export type {
  GeminiCredentialsOptions,
  GeminiInstallerPaths,
  GeminiModuleOptions,
  GeminiSessionEvent,
  GeminiWorkspaceOptions,
  ModuleReporter,
};
