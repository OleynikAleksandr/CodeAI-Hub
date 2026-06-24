export type ModelInvocationProviderId = "claude" | "codex";

export type ModelInvocationPurpose = "workflow-agent" | "translation";

export type ModelInvocationTree = "development" | "documentation";

export interface ModelInvocationSelector {
  readonly agentRole?: string;
  readonly modelId: string;
  readonly providerId: ModelInvocationProviderId;
  readonly purpose: ModelInvocationPurpose;
  readonly stepId?: string;
  readonly tree?: ModelInvocationTree;
}

export type ModelInvocationInstructionFragmentSource = "code" | "user-template";

export interface ModelInvocationInstructionFragment {
  readonly key: string;
  readonly optional?: boolean;
  readonly source: ModelInvocationInstructionFragmentSource;
}

export interface ModelInvocationProcessProfile {
  readonly approvalPolicy?: string;
  readonly processProfileKey: string;
  readonly sandbox?: string;
  readonly toolProfileKey: string;
}

export interface ModelInvocationSessionProfile {
  readonly config?: Readonly<Record<string, unknown>>;
  readonly instructionFragments: readonly ModelInvocationInstructionFragment[];
  readonly persistExtendedHistory: boolean;
  readonly sessionProfileKey: string;
}

export interface ModelInvocationTurnProfile {
  readonly effort?: string | null;
  readonly omitSummary?: boolean;
  readonly summary?: "detailed" | "none" | null;
  readonly turnProfileKey: string;
}

export interface EffectiveModelInvocationProfile {
  readonly compatibleModelIds: readonly string[];
  readonly processProfile: ModelInvocationProcessProfile;
  readonly selector: ModelInvocationSelector;
  readonly sessionProfile: ModelInvocationSessionProfile;
  readonly turnProfile: ModelInvocationTurnProfile;
}

const CODEX_WORKFLOW_MODELS = [
  "gpt-5.2",
  "gpt-5.3-codex-spark",
  "gpt-5.4-mini",
  "gpt-5.4",
  "gpt-5.5",
] as const;

const CODEX_TRANSLATION_MODELS = [
  "gpt-5.4-mini",
  "gpt-5.3-codex-spark",
] as const;

const CLAUDE_WORKFLOW_MODELS = ["sonnet", "opus", "haiku"] as const;
const CLAUDE_TRANSLATION_MODELS = ["claude-haiku-4-5-20251001"] as const;

const CODEX_THREAD_CONFIG = {
  project_doc_max_bytes: 0,
} as const;

const TRANSLATION_THREAD_CONFIG = {
  project_doc_max_bytes: 0,
} as const;

const SPARK_MODEL_ID = "gpt-5.3-codex-spark";
const CODEX_TRANSLATION_TOOL_PROFILE_KEY = "codex:translation-tools-minimal";

const normalizeOptionalString = (value: string | undefined): string | null =>
  value?.trim() ? value.trim() : null;

const requireWorkflowStep = (selector: ModelInvocationSelector): string => {
  const stepId = normalizeOptionalString(selector.stepId);
  if (!stepId) {
    throw new Error("workflow-agent invocation profile requires stepId");
  }
  return stepId;
};

const resolveWorkflowTree = (
  selector: ModelInvocationSelector
): "development" | "documentation" => selector.tree ?? "documentation";

const buildWorkflowInstructionFragments = (
  providerId: ModelInvocationProviderId,
  selector: ModelInvocationSelector
): readonly ModelInvocationInstructionFragment[] => {
  const tree = resolveWorkflowTree(selector);
  const stepId = requireWorkflowStep(selector);
  return [
    {
      key: `invocation/${providerId}/workflow-agent.system.md`,
      optional: true,
      source: "user-template",
    },
    {
      key: `workflow_steps/${tree}/${stepId}.system.md`,
      optional: true,
      source: "user-template",
    },
  ];
};

const buildTranslationInstructionFragments = (
  providerId: ModelInvocationProviderId
): readonly ModelInvocationInstructionFragment[] => [
  {
    key: `invocation/${providerId}/translation.system.md`,
    optional: true,
    source: "user-template",
  },
];

const buildCodexWorkflowProfile = (
  selector: ModelInvocationSelector
): EffectiveModelInvocationProfile => {
  const tree = resolveWorkflowTree(selector);
  return {
    compatibleModelIds: CODEX_WORKFLOW_MODELS,
    processProfile: {
      processProfileKey: `codex:workflow-${tree}`,
      toolProfileKey: "codex:workflow-research-tools",
    },
    selector: { ...selector, tree },
    sessionProfile: {
      config: CODEX_THREAD_CONFIG,
      instructionFragments: [
        {
          key: "codex:early-architecture-system-prompt",
          source: "code",
        },
        ...buildWorkflowInstructionFragments("codex", selector),
      ],
      persistExtendedHistory: true,
      sessionProfileKey: `codex:workflow-${tree}:${requireWorkflowStep(selector)}`,
    },
    turnProfile: {
      omitSummary: false,
      summary: selector.modelId === SPARK_MODEL_ID ? "none" : null,
      turnProfileKey: "codex:workflow-turn",
    },
  };
};

const buildCodexTranslationProfile = (
  selector: ModelInvocationSelector
): EffectiveModelInvocationProfile => ({
  compatibleModelIds: CODEX_TRANSLATION_MODELS,
  processProfile: {
    approvalPolicy: "never",
    processProfileKey: "codex:translation",
    sandbox: "read-only",
    toolProfileKey: CODEX_TRANSLATION_TOOL_PROFILE_KEY,
  },
  selector,
  sessionProfile: {
    config: TRANSLATION_THREAD_CONFIG,
    instructionFragments: [
      {
        key: "codex:translation-system-prompt",
        source: "code",
      },
      ...buildTranslationInstructionFragments("codex"),
    ],
    persistExtendedHistory: false,
    sessionProfileKey: "codex:translation",
  },
  turnProfile: {
    effort: "low",
    omitSummary: false,
    summary: "none",
    turnProfileKey: "codex:translation-turn",
  },
});

const buildClaudeWorkflowProfile = (
  selector: ModelInvocationSelector
): EffectiveModelInvocationProfile => {
  const tree = resolveWorkflowTree(selector);
  return {
    compatibleModelIds: CLAUDE_WORKFLOW_MODELS,
    processProfile: {
      processProfileKey: `claude:workflow-${tree}`,
      toolProfileKey: "claude:workflow-agent-tools",
    },
    selector: { ...selector, tree },
    sessionProfile: {
      instructionFragments: buildWorkflowInstructionFragments(
        "claude",
        selector
      ),
      persistExtendedHistory: true,
      sessionProfileKey: `claude:workflow-${tree}:${requireWorkflowStep(selector)}`,
    },
    turnProfile: {
      summary: null,
      turnProfileKey: "claude:workflow-turn",
    },
  };
};

const buildClaudeTranslationProfile = (
  selector: ModelInvocationSelector
): EffectiveModelInvocationProfile => ({
  compatibleModelIds: CLAUDE_TRANSLATION_MODELS,
  processProfile: {
    approvalPolicy: "never",
    processProfileKey: "claude:translation",
    sandbox: "read-only",
    toolProfileKey: "claude:translation-tools-disabled",
  },
  selector,
  sessionProfile: {
    instructionFragments: buildTranslationInstructionFragments("claude"),
    persistExtendedHistory: false,
    sessionProfileKey: "claude:translation",
  },
  turnProfile: {
    effort: null,
    summary: "none",
    turnProfileKey: "claude:translation-turn",
  },
});

export const normalizeModelInvocationPurpose = (
  value: unknown
): ModelInvocationPurpose | null =>
  value === "workflow-agent" || value === "translation" ? value : null;

export class ModelInvocationProfileResolver {
  resolve(selector: ModelInvocationSelector): EffectiveModelInvocationProfile {
    if (selector.providerId === "codex") {
      return selector.purpose === "translation"
        ? buildCodexTranslationProfile(selector)
        : buildCodexWorkflowProfile(selector);
    }
    if (selector.providerId === "claude") {
      return selector.purpose === "translation"
        ? buildClaudeTranslationProfile(selector)
        : buildClaudeWorkflowProfile(selector);
    }
    throw new Error(
      `Unsupported model invocation provider: ${selector.providerId}`
    );
  }
}
