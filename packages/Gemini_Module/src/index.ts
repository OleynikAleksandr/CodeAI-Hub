import { GeminiProviderAdapter as GeminiProviderAdapterImpl } from "./provider/gemini-provider-adapter";
import type {
  GeminiInstallerPaths as GeminiInstallerPathsType,
  GeminiModuleOptions as GeminiModuleOptionsType,
  GeminiSessionEvent as GeminiSessionEventType,
  GeminiWorkspaceOptions as GeminiWorkspaceOptionsType,
  ModuleReporter as ModuleReporterType,
} from "./types";

const GeminiProviderAdapter = GeminiProviderAdapterImpl;
type GeminiInstallerPaths = GeminiInstallerPathsType;
type GeminiModuleOptions = GeminiModuleOptionsType;
type GeminiSessionEvent = GeminiSessionEventType;
type GeminiWorkspaceOptions = GeminiWorkspaceOptionsType;
type ModuleReporter = ModuleReporterType;

export { GeminiProviderAdapter };
export type {
  GeminiInstallerPaths,
  GeminiModuleOptions,
  GeminiSessionEvent,
  GeminiWorkspaceOptions,
  ModuleReporter,
};
