const QUESTIONNAIRE_PENDING_STORAGE_PREFIX =
  "codeai-hub:idea-questionnaire:pending:";
const QUESTIONNAIRE_PENDING_STORAGE_VALUE = "1";

const buildQuestionnairePendingKey = (sessionId: string): string =>
  `${QUESTIONNAIRE_PENDING_STORAGE_PREFIX}${sessionId}`;

const readStorageValue = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorageValue = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage errors
  }
};

const removeStorageValue = (key: string): void => {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore storage errors
  }
};

export const isQuestionnairePendingStored = (sessionId: string): boolean =>
  readStorageValue(buildQuestionnairePendingKey(sessionId)) ===
  QUESTIONNAIRE_PENDING_STORAGE_VALUE;

export const markQuestionnairePendingStored = (sessionId: string): void => {
  writeStorageValue(
    buildQuestionnairePendingKey(sessionId),
    QUESTIONNAIRE_PENDING_STORAGE_VALUE
  );
};

export const clearQuestionnairePendingStored = (sessionId: string): void => {
  removeStorageValue(buildQuestionnairePendingKey(sessionId));
};
