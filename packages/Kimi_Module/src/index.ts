import {
  KIMI_PROVIDER_ID as BASE_KIMI_PROVIDER_ID,
  type KimiModuleOptions as BaseKimiModuleOptions,
  KimiProviderAdapter as BaseKimiProviderAdapter,
  type KimiSessionEvent as BaseKimiSessionEvent,
  type KimiWorkspaceOptions as BaseKimiWorkspaceOptions,
  type ModuleReporter as BaseModuleReporter,
  type SessionListener as BaseSessionListener,
} from "./provider/kimi-provider-adapter";
import {
  KIMI_SESSION_STALE_BINDING_ERROR_CODE as BASE_KIMI_SESSION_STALE_BINDING_ERROR_CODE,
  KimiSessionStaleBindingError as BaseKimiSessionStaleBindingError,
} from "./session/kimi-session-lifecycle";

export class KimiProviderAdapter extends BaseKimiProviderAdapter {}
export class KimiSessionStaleBindingError extends BaseKimiSessionStaleBindingError {}

export const KIMI_PROVIDER_ID = BASE_KIMI_PROVIDER_ID;
export const KIMI_SESSION_STALE_BINDING_ERROR_CODE =
  BASE_KIMI_SESSION_STALE_BINDING_ERROR_CODE;
export const KIMI_MODULE_BRIDGE_READY = true;

export type KimiModuleOptions = BaseKimiModuleOptions;
export type KimiWorkspaceOptions = BaseKimiWorkspaceOptions;
export type KimiSessionEvent = BaseKimiSessionEvent;
export type ModuleReporter = BaseModuleReporter;
export type SessionListener = BaseSessionListener;
