import {
  GeminiInstaller as BaseGeminiInstaller,
  type GeminiInstallerOptions as BaseGeminiInstallerOptions,
} from "./installer/gemini-installer";
import type { SessionListener as BaseSessionListener } from "./provider/gemini-provider-adapter";
import { GeminiProviderAdapter as BaseGeminiProviderAdapter } from "./provider/gemini-provider-adapter";
import {
  GEMINI_SESSION_STALE_BINDING_ERROR_CODE as BASE_GEMINI_SESSION_STALE_BINDING_ERROR_CODE,
  GeminiSessionStaleBindingError as BaseGeminiSessionStaleBindingError,
  isGeminiSessionStaleBindingError as baseIsGeminiSessionStaleBindingError,
} from "./provider/gemini-session-stale-binding-error";
import type {
  GeminiCredentialsOptions as BaseGeminiCredentialsOptions,
  GeminiInstallerPaths as BaseGeminiInstallerPaths,
  GeminiModuleOptions as BaseGeminiModuleOptions,
  GeminiSessionEvent as BaseGeminiSessionEvent,
  GeminiUpdateResult as BaseGeminiUpdateResult,
  GeminiWorkspaceOptions as BaseGeminiWorkspaceOptions,
  ModuleReporter as BaseModuleReporter,
} from "./types";

export class GeminiProviderAdapter extends BaseGeminiProviderAdapter {}
export class GeminiInstaller extends BaseGeminiInstaller {}
export class GeminiSessionStaleBindingError extends BaseGeminiSessionStaleBindingError {}
export const isGeminiSessionStaleBindingError =
  baseIsGeminiSessionStaleBindingError;
export const GEMINI_SESSION_STALE_BINDING_ERROR_CODE =
  BASE_GEMINI_SESSION_STALE_BINDING_ERROR_CODE;
export type SessionListener = BaseSessionListener;
export type GeminiInstallerPaths = BaseGeminiInstallerPaths;
export type GeminiInstallerOptions = BaseGeminiInstallerOptions;
export type GeminiModuleOptions = BaseGeminiModuleOptions;
export type GeminiWorkspaceOptions = BaseGeminiWorkspaceOptions;
export type GeminiCredentialsOptions = BaseGeminiCredentialsOptions;
export type GeminiSessionEvent = BaseGeminiSessionEvent;
export type GeminiUpdateResult = BaseGeminiUpdateResult;
export type ModuleReporter = BaseModuleReporter;

export const GEMINI_MODULE_BRIDGE_READY = true;
