export const DEFAULT_LOCALIZATION_LANGUAGE = "en";
export const DEFAULT_TRANSLATION_ENGINE_ID = "google-gtx";

export const DEFAULT_LOCALIZATION_SETTINGS = {
  defaultLanguage: DEFAULT_LOCALIZATION_LANGUAGE,
  categories: {
    artifactsForTheUser: DEFAULT_LOCALIZATION_LANGUAGE,
    interactiveTemplates: DEFAULT_LOCALIZATION_LANGUAGE,
    messagesForTheUser: DEFAULT_LOCALIZATION_LANGUAGE,
    reasoning: DEFAULT_LOCALIZATION_LANGUAGE,
    systemFeedback: DEFAULT_LOCALIZATION_LANGUAGE,
    uiHelperText: DEFAULT_LOCALIZATION_LANGUAGE,
    uiInterface: DEFAULT_LOCALIZATION_LANGUAGE,
    uiLabels: DEFAULT_LOCALIZATION_LANGUAGE,
    userGuidance: DEFAULT_LOCALIZATION_LANGUAGE,
    workflowTerms: DEFAULT_LOCALIZATION_LANGUAGE,
  },
  workflowTermsPolicy: "keep_english",
  uiEngineId: DEFAULT_TRANSLATION_ENGINE_ID,
  reasoningEngineId: DEFAULT_TRANSLATION_ENGINE_ID,
  glossaryEnabled: true,
} as const;

export const DEFAULT_SETTINGS_SNAPSHOT = {
  general: {
    coreControls: {
      allowRestart: true,
    },
    localization: DEFAULT_LOCALIZATION_SETTINGS,
    responsePolicy: {
      mode: "hybrid",
      strictOutput: {
        schemaText: `${JSON.stringify(
          {
            type: "object",
            additionalProperties: false,
            properties: {
              answer: {
                type: "string",
                description: "Final answer for the user. Markdown allowed.",
              },
            },
            required: ["answer"],
          },
          null,
          2
        )}\n`,
        instructionText: [
          "You must respond with a JSON object that matches the provided schema.",
          "Populate the field:",
          "- answer: the user-facing answer.",
          "Return only JSON, no extra text.",
          "",
          "User request:",
        ].join("\n"),
      },
    },
    textToSpeech: {
      rate: 1,
    },
  },
  providers: {
    claude: {
      thinking: {
        enabled: true,
        effort: "medium",
      },
      thinkingDisplaySyncEnabled: true,
      autoUpdate: { enabled: false },
      defaultModel: "sonnet",
      sessionContinuity: { remainingPercentThreshold: 30 },
    },
    codex: {
      autoUpdate: { enabled: false },
      defaultModel: "gpt-5.4-mini",
      reasoningByModel: {
        "gpt-5.2": "medium",
        "gpt-5.3-codex-spark": "medium",
        "gpt-5.4-mini": "medium",
        "gpt-5.4": "medium",
        "gpt-5.5": "medium",
      },
      sessionContinuity: { remainingPercentThreshold: 30 },
    },
    gemini: {
      autoUpdate: { enabled: false },
      defaultModel: "gemini-3-pro-preview",
      thinkingDisplaySyncEnabled: true,
      thinkingLevelByModel: {},
      sessionContinuity: {
        remainingPercentThreshold: 30,
        contextWindowTokenLimit: 300_000,
      },
    },
    kimi: {
      autoUpdate: { enabled: false },
      defaultModel: "kimi-k2.7-code",
      thinkingDisplaySyncEnabled: true,
    },
    glmClaudeCode: {
      apiKey: "",
      baseUrl: "https://api.z.ai/api/anthropic",
      configPath: "~/.codeai-hub/providers/glm-claude-code/config.json",
      defaultModel: "glm-5.2",
      haikuModel: "glm-5.2",
      opusModel: "glm-5.2",
      sonnetModel: "glm-5.2",
      thinkingDisplaySyncEnabled: true,
    },
    glmOpenCode: {
      apiKey: "",
      configPath: "~/.codeai-hub/providers/opencode/config.json",
      defaultModel: "zai-coding-plan/glm-5.2",
      thinkingDisplaySyncEnabled: true,
    },
  },
} as const;
