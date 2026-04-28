import { buildCodexReasoningSummaryParams } from "../app-server/codex-reasoning-summary-params";
import {
  buildCodexAppServerTranslationPromptProfile,
  type CodexAppServerTranslationPromptProfile,
} from "../translation/codex-translation-prompt-profile";

const TRANSLATION_CAPTURE_APPROVAL_POLICY = "never";
const TRANSLATION_CAPTURE_PROCESS_PROFILE_KEY = "codex:translation";
const TRANSLATION_CAPTURE_SANDBOX = "read-only";
const TRANSLATION_CAPTURE_SCENARIO_ID = "translation";
const TRANSLATION_ONLY_INSTRUCTIONS_PATTERN = /\btranslation-only engine\b/;
const TRANSLATION_TOOL_FREE_INSTRUCTIONS_PATTERN =
  /Do not use tools, shell commands, files, patches, web search, planning, or user-input requests\./;
const TRANSLATION_TOOL_FREE_PROMPT_PATTERN =
  /Do not use tools or add commentary\./;
const TRANSLATION_CAPTURE_SAMPLE = {
  category: "generic",
  sourceLanguage: "en",
  targetLanguage: "es",
  text: "CodeAI Hub native request capture translation sample.",
} as const;

export type CodexNativeRequestCaptureInvocationPurpose =
  | "translation"
  | "workflow-agent";

export const isCodexNativeTranslationCapture = (options: {
  readonly invocationPurpose?: CodexNativeRequestCaptureInvocationPurpose;
  readonly scenarioId?: string | null;
}): boolean =>
  options.invocationPurpose === "translation" ||
  options.scenarioId === TRANSLATION_CAPTURE_SCENARIO_ID;

export const buildCodexNativeTranslationCapturePromptProfile = (
  modelId: string
): CodexAppServerTranslationPromptProfile => {
  const promptProfile = buildCodexAppServerTranslationPromptProfile({
    modelId,
    request: TRANSLATION_CAPTURE_SAMPLE,
  });
  assertCodexNativeTranslationCaptureProfile(promptProfile);
  return promptProfile;
};

export const buildCodexNativeTranslationThreadStartParams = (options: {
  readonly promptProfile: CodexAppServerTranslationPromptProfile;
  readonly workspacePath: string;
}) => ({
  approvalPolicy: TRANSLATION_CAPTURE_APPROVAL_POLICY,
  baseInstructions: options.promptProfile.baseInstructions,
  config: options.promptProfile.threadConfig,
  cwd: options.workspacePath,
  model: options.promptProfile.modelId,
  persistExtendedHistory: options.promptProfile.persistExtendedHistory,
  sandbox: TRANSLATION_CAPTURE_SANDBOX,
});

export const buildCodexNativeTranslationTurnStartParams = (options: {
  readonly promptProfile: CodexAppServerTranslationPromptProfile;
  readonly threadId: string;
  readonly workspacePath: string;
}) => ({
  cwd: options.workspacePath,
  effort: options.promptProfile.effort,
  input: [
    {
      text: options.promptProfile.userPrompt,
      text_elements: [],
      type: "text",
    },
  ],
  model: options.promptProfile.modelId,
  threadId: options.threadId,
  ...(options.promptProfile.omitSummary
    ? {}
    : buildCodexReasoningSummaryParams(
        options.promptProfile.modelId,
        options.promptProfile.summary ?? "none"
      )),
});

const assertCodexNativeTranslationCaptureProfile = (
  promptProfile: CodexAppServerTranslationPromptProfile
): void => {
  if (
    promptProfile.processProfileKey !== TRANSLATION_CAPTURE_PROCESS_PROFILE_KEY
  ) {
    throw new Error(
      "Codex native translation capture must use codex:translation"
    );
  }
  if (promptProfile.persistExtendedHistory !== false) {
    throw new Error(
      "Codex native translation capture must not persist history"
    );
  }
  if (promptProfile.threadConfig.project_doc_max_bytes !== 0) {
    throw new Error(
      "Codex native translation capture must disable project docs"
    );
  }
  assertPromptMatches(
    promptProfile.baseInstructions,
    TRANSLATION_ONLY_INSTRUCTIONS_PATTERN,
    "translation-only base instructions"
  );
  assertPromptMatches(
    promptProfile.baseInstructions,
    TRANSLATION_TOOL_FREE_INSTRUCTIONS_PATTERN,
    "tool-free base instructions"
  );
  assertPromptMatches(
    promptProfile.userPrompt,
    TRANSLATION_TOOL_FREE_PROMPT_PATTERN,
    "tool-free user prompt"
  );
};

const assertPromptMatches = (
  value: string,
  pattern: RegExp,
  label: string
): void => {
  if (!pattern.test(value)) {
    throw new Error(`Codex native translation capture missing ${label}`);
  }
};
