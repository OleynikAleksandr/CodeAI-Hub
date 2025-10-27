import { ClaudeProviderAdapter as ClaudeProviderAdapterImpl } from "./provider/claude-provider-adapter";
import type {
  ClaudeInstallerPaths as ClaudeInstallerPathsType,
  ClaudeModuleOptions as ClaudeModuleOptionsType,
  ClaudeWorkspaceOptions as ClaudeWorkspaceOptionsType,
  ModuleReporter as ModuleReporterType,
} from "./types";

const ClaudeProviderAdapter = ClaudeProviderAdapterImpl;
type ClaudeInstallerPaths = ClaudeInstallerPathsType;
type ClaudeModuleOptions = ClaudeModuleOptionsType;
type ClaudeWorkspaceOptions = ClaudeWorkspaceOptionsType;
type ModuleReporter = ModuleReporterType;

export { ClaudeProviderAdapter };
export type {
  ClaudeInstallerPaths,
  ClaudeModuleOptions,
  ClaudeWorkspaceOptions,
  ModuleReporter,
};
