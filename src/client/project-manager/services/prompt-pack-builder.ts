export type WorkflowStageId =
  | "description"
  | "virtual_simulation"
  | "diagram_modules"
  | "application_skeleton"
  | "quality_gates";

const DEFAULT_CHAT_LANGUAGE = "en";
const LEGACY_SOURCE_LANGUAGE = "source";

const isRecordValue = (
  value: unknown
): value is Readonly<Record<string, unknown>> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeRuntimeLanguage = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === LEGACY_SOURCE_LANGUAGE) {
    return null;
  }
  return normalized;
};

export const resolveWorkflowChatLanguage = (payload: unknown): string => {
  const payloadRecord = isRecordValue(payload) ? payload : null;
  const settings = isRecordValue(payloadRecord?.settings)
    ? payloadRecord.settings
    : null;
  const general = isRecordValue(settings?.general) ? settings.general : null;
  const localization = isRecordValue(general?.localization)
    ? general.localization
    : null;
  const categories = isRecordValue(localization?.categories)
    ? localization.categories
    : null;

  return (
    normalizeRuntimeLanguage(categories?.reasoning) ??
    normalizeRuntimeLanguage(categories?.messagesForTheUser) ??
    normalizeRuntimeLanguage(categories?.systemFeedback) ??
    DEFAULT_CHAT_LANGUAGE
  );
};
