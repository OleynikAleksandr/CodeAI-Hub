import type { IncomingMessage } from "../core-stream-message-types";
import type { WorkspaceProject } from "../types";

export type CoreStreamMessageValidationResult =
  | { readonly message: IncomingMessage; readonly ok: true }
  | { readonly error?: unknown; readonly ok: false; readonly reason: string };

type PayloadValidator = (payload: unknown) => boolean;

const OBJECT_PAYLOAD_MESSAGE_TYPES = new Set([
  "command:error",
  "core:loading-status",
  "dialog:history:result",
  "dialog:list:result",
  "dialog:message",
  "dialog:message_translation",
  "dialog:open:result",
  "dialog:send:ack",
  "session:binding",
  "session:created",
  "session:deleted",
  "session:error",
  "session:history",
  "session:message",
  "session:message_translation",
  "session:model:update",
  "session:stream",
  "settings:native-request-capture:result",
  "settings:saved",
  "settings:template-update:resolve:result",
  "settings:template-updates:result",
  "workspace:scope:ack",
  "workspace:select:ack",
  "workspace:snapshot",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isStringOrNull = (value: unknown): value is string | null =>
  typeof value === "string" || value === null;

const isOptionalStringOrNull = (value: unknown): boolean =>
  value === undefined || isStringOrNull(value);

const isWorkspaceProject = (value: unknown): value is WorkspaceProject => {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.lastUsed === "string" &&
    typeof value.name === "string" &&
    typeof value.path === "string" &&
    typeof value.slug === "string" &&
    (value.icon === undefined || typeof value.icon === "string")
  );
};

const isProjectUpdatePayload = (payload: unknown): boolean =>
  isRecord(payload) &&
  Array.isArray(payload.projects) &&
  payload.projects.every(isWorkspaceProject);

const isSettingsSaveErrorPayload = (payload: unknown): boolean =>
  isRecord(payload) && typeof payload.error === "string";

const isSettingsLocalizationSyncStatusPayload = (
  payload: unknown
): boolean =>
  isRecord(payload) &&
  typeof payload.busy === "boolean" &&
  isStringOrNull(payload.message);

const isSettingsVersionsPayload = (payload: unknown): boolean =>
  isRecord(payload) && isOptionalStringOrNull(payload.error);

const isSettingsUserGlossaryFilePayload = (payload: unknown): boolean =>
  isRecord(payload) &&
  isOptionalStringOrNull(payload.error) &&
  isStringOrNull(payload.path);

const KNOWN_PAYLOAD_VALIDATORS: Readonly<Record<string, PayloadValidator>> = {
  "core:state": isRecord,
  "projects:update": isProjectUpdatePayload,
  "settings:loaded": isRecord,
  "settings:localization-sync-status": isSettingsLocalizationSyncStatusPayload,
  "settings:save-error": isSettingsSaveErrorPayload,
  "settings:user-glossary-file": isSettingsUserGlossaryFilePayload,
  "settings:versions": isSettingsVersionsPayload,
};

const validateKnownPayload = (type: string, payload: unknown): boolean => {
  const validator = KNOWN_PAYLOAD_VALIDATORS[type];
  if (validator) {
    return validator(payload);
  }
  if (OBJECT_PAYLOAD_MESSAGE_TYPES.has(type)) {
    return isRecord(payload);
  }
  return true;
};

const validateCoreStreamMessage = (
  candidate: unknown
): CoreStreamMessageValidationResult => {
  if (!isRecord(candidate)) {
    return { ok: false, reason: "message-not-object" };
  }
  if (typeof candidate.type !== "string" || candidate.type.trim().length === 0) {
    return { ok: false, reason: "message-type-invalid" };
  }
  if (!validateKnownPayload(candidate.type, candidate.payload)) {
    return { ok: false, reason: `invalid-payload:${candidate.type}` };
  }
  return { message: candidate as IncomingMessage, ok: true };
};

export const parseCoreStreamMessage = (
  serialized: string
): CoreStreamMessageValidationResult => {
  try {
    return validateCoreStreamMessage(JSON.parse(serialized) as unknown);
  } catch (error) {
    return { error, ok: false, reason: "invalid-json" };
  }
};
