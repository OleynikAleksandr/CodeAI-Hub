import { readFileSync } from "node:fs";

const PROMPT_ENV = "CODEAI_LMSTUDIO_SYSTEM_PROMPT";
const PROMPT_FILE_ENV = "CODEAI_LMSTUDIO_SYSTEM_PROMPT_FILE";

export const LOCAL_MODELS_WORKFLOW_TEMPERATURE = 0.3;

const normalizePrompt = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const resolveLocalModelsSystemPrompt = (fallback: string): string => {
  const inlinePrompt = normalizePrompt(process.env[PROMPT_ENV]);
  if (inlinePrompt) {
    return inlinePrompt;
  }

  const promptPath = normalizePrompt(process.env[PROMPT_FILE_ENV]);
  if (!promptPath) {
    return fallback;
  }

  const filePrompt = readFileSync(promptPath, "utf8").trim();
  if (!filePrompt) {
    throw new Error(`${PROMPT_FILE_ENV} points to an empty file.`);
  }
  return filePrompt;
};
