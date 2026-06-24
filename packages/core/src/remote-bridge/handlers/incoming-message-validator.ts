import type { IncomingMessage } from "../types";
import {
  isWorkbenchArtifactReadPayload,
  isWorkbenchStateKind,
  isWorkbenchStatePayload,
} from "./workbench-state-types";

export type IncomingMessageValidationResult =
  | { readonly message: IncomingMessage; readonly ok: true }
  | {
      readonly errorMessage?: string;
      readonly ok: false;
      readonly reason: string;
    };

type PayloadValidator = (payload: unknown) => boolean;

const NO_PAYLOAD_COMMANDS = new Set([
  "projects:list",
  "settings:template-updates",
  "settings:versions",
]);

const DIALOG_SWITCH_MODES = new Set([
  "retry_in_place",
  "switch_model",
  "switch_provider",
]);
const CLAUDE_MODEL_ALIASES = new Set(["sonnet", "opus", "haiku"]);
const CLAUDE_THINKING_EFFORTS = new Set([
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
]);
const CODEX_REASONING_EFFORTS = new Set(["low", "medium", "high", "xhigh"]);

const NATIVE_CAPTURE_PROVIDERS = new Set(["claude", "codex"]);
const PROVIDER_IDS = new Set(["claude", "codex"]);
const SETTINGS_PROVIDER_TARGETS = new Set(["cli", "sdk"]);
const TEMPLATE_RESOLUTION_ACTIONS = new Set([
  "backup-and-replace",
  "preserve-current",
  "replace-with-incoming",
]);
const USAGE_REFRESH_TRIGGERS = new Set([
  "binding_ready",
  "dialog_opened",
  "manual",
  "provider_session_rebound",
  "reconnect",
  "session_opened",
  "turn_completed",
]);
const WORKSPACE_SCOPE_REASONS = new Set([
  "reconnect",
  "workspace_cleared",
  "workspace_selected",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isStringOrNull = (value: unknown): boolean =>
  typeof value === "string" || value === null;

const isOptionalString = (value: unknown): boolean =>
  value === undefined || typeof value === "string";

const isOptionalStringOrNull = (value: unknown): boolean =>
  value === undefined || isStringOrNull(value);

const isOptionalRecord = (value: unknown): boolean =>
  value === undefined || value === null || isRecord(value);

const isOptionalNumber = (value: unknown): boolean =>
  value === undefined || typeof value === "number";

const isNoPayload = (payload: unknown): boolean => payload === undefined;

const isMessageContentPayload = (value: unknown): boolean => {
  if (typeof value === "string") {
    return true;
  }
  if (!isRecord(value)) {
    return false;
  }
  const hasText = typeof value.text === "string";
  const hasContent = typeof value.content === "string";
  const hasValidTurnOptions =
    value.turnOptions === undefined || isRecord(value.turnOptions);
  return (hasText || hasContent) && hasValidTurnOptions;
};

const isSessionCreatePayload = (payload: unknown): boolean =>
  isRecord(payload) &&
  isOptionalString(payload.providerId) &&
  isOptionalString(payload.workspacePath) &&
  isOptionalStringOrNull(payload.initiativeSlug) &&
  isOptionalStringOrNull(payload.providerSessionId) &&
  isOptionalStringOrNull(payload.stage) &&
  isOptionalStringOrNull(payload.runSlug) &&
  isOptionalStringOrNull(payload.targetModelId) &&
  isOptionalRecord(payload.modelSelection);

const isSessionIdPayload = (payload: unknown): boolean =>
  isRecord(payload) && typeof payload.sessionId === "string";

const isSessionMessagePayload = (payload: unknown): boolean =>
  isRecord(payload) &&
  typeof payload.sessionId === "string" &&
  isMessageContentPayload(payload.content);

const isSessionSpeechSpeakPayload = (payload: unknown): boolean =>
  isRecord(payload) &&
  typeof payload.sessionId === "string" &&
  typeof payload.messageId === "string" &&
  typeof payload.text === "string" &&
  isOptionalStringOrNull(payload.providerId) &&
  isOptionalStringOrNull(payload.language) &&
  (payload.rate === undefined ||
    payload.rate === null ||
    (typeof payload.rate === "number" && Number.isFinite(payload.rate)));

const isSessionSpeechStopPayload = (payload: unknown): boolean =>
  isRecord(payload) &&
  isOptionalStringOrNull(payload.sessionId) &&
  isOptionalStringOrNull(payload.messageId);

const isCodexModelSwitchPayload = (payload: unknown): boolean =>
  isRecord(payload) &&
  typeof payload.sessionId === "string" &&
  typeof payload.targetModelId === "string";
const isLocalModelsModelSwitchPayload = isCodexModelSwitchPayload;

const isCodexReasoningSwitchPayload = (payload: unknown): boolean =>
  isRecord(payload) &&
  typeof payload.sessionId === "string" &&
  typeof payload.targetReasoningEffort === "string" &&
  CODEX_REASONING_EFFORTS.has(payload.targetReasoningEffort);

const isClaudeModelSwitchPayload = (payload: unknown): boolean =>
  isRecord(payload) &&
  typeof payload.sessionId === "string" &&
  typeof payload.targetModelId === "string" &&
  CLAUDE_MODEL_ALIASES.has(payload.targetModelId);

const isClaudeThinkingSwitchPayload = (payload: unknown): boolean =>
  isRecord(payload) &&
  typeof payload.sessionId === "string" &&
  typeof payload.thinkingEnabled === "boolean" &&
  (payload.targetReasoningEffort === undefined ||
    (typeof payload.targetReasoningEffort === "string" &&
      CLAUDE_THINKING_EFFORTS.has(payload.targetReasoningEffort)));

const isUsageRefreshPayload = (payload: unknown): boolean =>
  isRecord(payload) &&
  typeof payload.providerId === "string" &&
  isStringOrNull(payload.providerSessionId) &&
  typeof payload.sessionId === "string" &&
  (payload.lifecycleTrigger === undefined ||
    payload.lifecycleTrigger === null ||
    (typeof payload.lifecycleTrigger === "string" &&
      USAGE_REFRESH_TRIGGERS.has(payload.lifecycleTrigger)));

const isDialogListPayload = (payload: unknown): boolean =>
  isRecord(payload) &&
  typeof payload.requestId === "string" &&
  typeof payload.workspaceSlug === "string" &&
  isOptionalString(payload.workspacePath);

const isDialogOpenPayload = (payload: unknown): boolean =>
  isRecord(payload) &&
  isDialogListPayload(payload) &&
  typeof payload.dialogId === "string";

const isDialogHistoryPayload = (payload: unknown): boolean =>
  isRecord(payload) &&
  isDialogOpenPayload(payload) &&
  isOptionalNumber(payload.cursor);

const isDialogSendPayload = (payload: unknown): boolean =>
  isRecord(payload) &&
  isDialogOpenPayload(payload) &&
  typeof payload.content === "string" &&
  (payload.turnOptions === undefined || isRecord(payload.turnOptions));

const isDialogSwitchRequestPayload = (payload: unknown): boolean =>
  isRecord(payload) &&
  typeof payload.sessionId === "string" &&
  typeof payload.mode === "string" &&
  DIALOG_SWITCH_MODES.has(payload.mode) &&
  isOptionalString(payload.targetModelId) &&
  isOptionalString(payload.targetProviderId);

const isDialogSwitchConfirmPayload = (payload: unknown): boolean =>
  isRecord(payload) &&
  typeof payload.dialogId === "string" &&
  typeof payload.targetProviderId === "string" &&
  typeof payload.mode === "string" &&
  DIALOG_SWITCH_MODES.has(payload.mode) &&
  isOptionalString(payload.targetModelId);

const isDialogSwitchCancelPayload = (payload: unknown): boolean =>
  isRecord(payload) && typeof payload.dialogId === "string";

const isSettingsSavePayload = (payload: unknown): boolean =>
  isRecord(payload) && "settings" in payload;

const isSettingsWorkspaceScopePayload = (payload: unknown): boolean =>
  payload === undefined ||
  payload === null ||
  (isRecord(payload) &&
    isOptionalStringOrNull(payload.workspacePath) &&
    isOptionalStringOrNull(payload.workspaceSlug));

const isSettingsUpdateProviderPayload = (payload: unknown): boolean =>
  isRecord(payload) &&
  typeof payload.provider === "string" &&
  PROVIDER_IDS.has(payload.provider) &&
  typeof payload.target === "string" &&
  SETTINGS_PROVIDER_TARGETS.has(payload.target);

const isSettingsTemplateResolutionPayload = (payload: unknown): boolean =>
  isRecord(payload) &&
  typeof payload.id === "string" &&
  typeof payload.action === "string" &&
  TEMPLATE_RESOLUTION_ACTIONS.has(payload.action);

const isNativeRequestCapturePayload = (payload: unknown): boolean =>
  isRecord(payload) &&
  typeof payload.providerId === "string" &&
  NATIVE_CAPTURE_PROVIDERS.has(payload.providerId) &&
  isOptionalStringOrNull(payload.modelId) &&
  isOptionalStringOrNull(payload.reasoning) &&
  isOptionalStringOrNull(payload.scenarioId) &&
  isOptionalStringOrNull(payload.scenarioInputPath) &&
  isOptionalStringOrNull(payload.scenarioLabel) &&
  isOptionalStringOrNull(payload.scenarioPrompt) &&
  isOptionalStringOrNull(payload.scenarioTargetPath) &&
  isOptionalStringOrNull(payload.workspacePath);

const isWorkbenchStateLoadPayload = (payload: unknown): boolean =>
  isRecord(payload) && isWorkbenchStateKind(payload.kind);

const isWorkbenchStateSavePayload = (payload: unknown): boolean =>
  isRecord(payload) &&
  isWorkbenchStateKind(payload.kind) &&
  isWorkbenchStatePayload(payload.kind, payload.state);

const isProjectAddPayload = (payload: unknown): boolean =>
  isRecord(payload) &&
  typeof payload.path === "string" &&
  isOptionalString(payload.name);

const isProjectRemovePayload = (payload: unknown): boolean =>
  isRecord(payload) && typeof payload.id === "string";

const isDiagnosticLogPayload = (payload: unknown): boolean =>
  isRecord(payload) &&
  typeof payload.channel === "string" &&
  typeof payload.event === "string" &&
  (payload.context === undefined || isRecord(payload.context));

const isWorkspaceScopeSetPayload = (payload: unknown): boolean =>
  isRecord(payload) &&
  typeof payload.requestId === "string" &&
  isStringOrNull(payload.workspacePath) &&
  typeof payload.reason === "string" &&
  WORKSPACE_SCOPE_REASONS.has(payload.reason) &&
  isOptionalStringOrNull(payload.workspaceSlug);

const isWorkspaceSelectPayload = (payload: unknown): boolean =>
  isRecord(payload) &&
  typeof payload.requestId === "string" &&
  isStringOrNull(payload.workspaceRoot) &&
  typeof payload.reason === "string" &&
  WORKSPACE_SCOPE_REASONS.has(payload.reason);

const isWorkspaceSnapshotRequestPayload = (payload: unknown): boolean =>
  isRecord(payload) &&
  typeof payload.requestId === "string" &&
  typeof payload.workspaceRoot === "string" &&
  (payload.reason === "debug" || payload.reason === "resync");

const PAYLOAD_VALIDATORS: Readonly<Record<string, PayloadValidator>> = {
  "dialog:history": isDialogHistoryPayload,
  "dialog:list": isDialogListPayload,
  "dialog:open": isDialogOpenPayload,
  "dialog:send": isDialogSendPayload,
  "dialog:switch:cancel": isDialogSwitchCancelPayload,
  "dialog:switch:confirm": isDialogSwitchConfirmPayload,
  "dialog:switch:request": isDialogSwitchRequestPayload,
  "pm:diag:log": isDiagnosticLogPayload,
  "projects:add": isProjectAddPayload,
  "projects:remove": isProjectRemovePayload,
  "session:claude:model-switch": isClaudeModelSwitchPayload,
  "session:claude:thinking-switch": isClaudeThinkingSwitchPayload,
  "session:codex:model-switch": isCodexModelSwitchPayload,
  "session:codex:reasoning-switch": isCodexReasoningSwitchPayload,
  "session:local-models:model-switch": isLocalModelsModelSwitchPayload,
  "session:create": isSessionCreatePayload,
  "session:delete": isSessionIdPayload,
  "session:message": isSessionMessagePayload,
  "session:refreshUsageLimits": isUsageRefreshPayload,
  "session:speech:speak-message": isSessionSpeechSpeakPayload,
  "session:speech:stop": isSessionSpeechStopPayload,
  "session:stop": isSessionIdPayload,
  "settings:load": isSettingsWorkspaceScopePayload,
  "settings:native-request-capture": isNativeRequestCapturePayload,
  "settings:open-user-glossary-file": isSettingsWorkspaceScopePayload,
  "settings:reset": isSettingsWorkspaceScopePayload,
  "settings:save": isSettingsSavePayload,
  "settings:template-update:resolve": isSettingsTemplateResolutionPayload,
  "settings:update-provider": isSettingsUpdateProviderPayload,
  "workbench:artifact:read": isWorkbenchArtifactReadPayload,
  "workbench:state:load": isWorkbenchStateLoadPayload,
  "workbench:state:save": isWorkbenchStateSavePayload,
  "workspace:scope:set": isWorkspaceScopeSetPayload,
  "workspace:select": isWorkspaceSelectPayload,
  "workspace:snapshot:request": isWorkspaceSnapshotRequestPayload,
};

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const validateParsedMessage = (
  candidate: unknown
): IncomingMessageValidationResult => {
  if (!isRecord(candidate)) {
    return { ok: false, reason: "message-not-object" };
  }
  if (
    typeof candidate.type !== "string" ||
    candidate.type.trim().length === 0
  ) {
    return { ok: false, reason: "message-type-invalid" };
  }
  if (NO_PAYLOAD_COMMANDS.has(candidate.type)) {
    return isNoPayload(candidate.payload)
      ? { message: candidate as IncomingMessage, ok: true }
      : { ok: false, reason: `invalid-payload:${candidate.type}` };
  }
  const validator = PAYLOAD_VALIDATORS[candidate.type];
  if (!validator) {
    return { ok: false, reason: `unknown-command:${candidate.type}` };
  }
  if (!validator(candidate.payload)) {
    return { ok: false, reason: `invalid-payload:${candidate.type}` };
  }
  return { message: candidate as IncomingMessage, ok: true };
};

export const parseIncomingClientMessage = (
  raw: string
): IncomingMessageValidationResult => {
  try {
    return validateParsedMessage(JSON.parse(raw) as unknown);
  } catch (error) {
    return {
      errorMessage: toErrorMessage(error),
      ok: false,
      reason: "invalid-json",
    };
  }
};
