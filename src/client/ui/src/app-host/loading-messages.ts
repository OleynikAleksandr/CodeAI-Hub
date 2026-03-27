export type MessageId = "core" | "claude" | "codex" | "gemini";

export interface LoadingMessage {
  readonly detail?: string;
  readonly id: MessageId;
  readonly status: string;
}

export const MESSAGE_ORDER: readonly MessageId[] = [
  "core",
  "claude",
  "codex",
  "gemini",
];

export const MESSAGE_ROTATION_INTERVAL_MS = 2800;

export const DEFAULT_MESSAGES: Record<MessageId, LoadingMessage> = {
  core: {
    id: "core",
    status: "Checking CodeAI Hub services...",
    detail: "Validating local components.",
  },
  claude: {
    id: "claude",
    status: "Preparing Claude tools...",
    detail: "Making sure everything is authenticated.",
  },
  codex: {
    id: "codex",
    status: "Preparing Codex tools...",
    detail: "Verifying your CLI installation.",
  },
  gemini: {
    id: "gemini",
    status: "Preparing Gemini tools...",
    detail: "This may take a little longer the first time.",
  },
};

export const createDefaultMessages = (): Record<MessageId, LoadingMessage> => ({
  core: { ...DEFAULT_MESSAGES.core },
  claude: { ...DEFAULT_MESSAGES.claude },
  codex: { ...DEFAULT_MESSAGES.codex },
  gemini: { ...DEFAULT_MESSAGES.gemini },
});

export const resolveMessageId = (
  scope: string | undefined,
  phase: string | undefined
): MessageId | null => {
  if (!scope) {
    return phase === "provider" ? "core" : "core";
  }
  if (scope === "core" || scope === "providers") {
    return "core";
  }
  if (scope.includes("claude")) {
    return "claude";
  }
  if (scope.includes("codex")) {
    return "codex";
  }
  if (scope.includes("gemini")) {
    return "gemini";
  }
  return null;
};
