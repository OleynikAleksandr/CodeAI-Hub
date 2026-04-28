import { buildCodexReasoningSummaryParams } from "../app-server/codex-reasoning-summary-params";
import {
  buildCodexAppServerTranslationPromptProfile,
  type CodexAppServerTranslationPromptProfile,
} from "../translation/codex-translation-prompt-profile";

const TRANSLATION_CAPTURE_APPROVAL_POLICY = "never";
const TRANSLATION_CAPTURE_SANDBOX = "read-only";
const TRANSLATION_CAPTURE_SCENARIO_ID = "translation";
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
): CodexAppServerTranslationPromptProfile =>
  buildCodexAppServerTranslationPromptProfile({
    modelId,
    request: TRANSLATION_CAPTURE_SAMPLE,
  });

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
