import type { WorkflowStageId } from "./prompt-pack-builder";

const DEFAULT_ARTIFACT_LANGUAGE = "en";
const DEFAULT_CHAT_LANGUAGE = "en";
const LEGACY_SOURCE_LANGUAGE = "source";
const RUSSIAN_LANGUAGE_CODES = new Set(["ru", "ru-ru"]);

const normalizeArtifactLanguage = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return DEFAULT_ARTIFACT_LANGUAGE;
  }
  return normalized === LEGACY_SOURCE_LANGUAGE
    ? DEFAULT_ARTIFACT_LANGUAGE
    : normalized;
};

export const normalizeRuntimeLanguage = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  return normalized === LEGACY_SOURCE_LANGUAGE
    ? DEFAULT_CHAT_LANGUAGE
    : normalized;
};

const isRussian = (value: string | undefined): boolean =>
  RUSSIAN_LANGUAGE_CODES.has(
    normalizeRuntimeLanguage(value) ?? DEFAULT_CHAT_LANGUAGE
  );

export const buildRuntimeLanguageBlock = (params: {
  readonly artifactLanguage: string | undefined;
  readonly chatLanguage: string | undefined;
  readonly stage: WorkflowStageId;
}): string => {
  const normalizedChatLanguage =
    normalizeRuntimeLanguage(params.chatLanguage) ?? DEFAULT_CHAT_LANGUAGE;
  const normalizedArtifactLanguage = normalizeArtifactLanguage(
    params.artifactLanguage ?? DEFAULT_ARTIFACT_LANGUAGE
  );
  const lines = [
    "Workflow runtime language contract:",
    `- Chat language code: \`${normalizedChatLanguage}\` (from Settings > General > Reasoning).`,
    `- Use \`${normalizedChatLanguage}\` for brief user-facing chat updates and status replies.`,
    `- Artifact prose language code: \`${normalizedArtifactLanguage}\` (from Settings > General > Artifacts for the User).`,
    `- Write user-facing prose inside created or edited artifacts in \`${normalizedArtifactLanguage}\`.`,
    "- English internal instructions, examples, and templates are format-only; do not infer English output language from them.",
    "- Do not rewrite internal instructions, code identifiers, canonical headings, field names, ids, statuses, DSL markers, file names, or structural tokens to match either language.",
    params.stage === "diagram_modules"
      ? "- Keep Product Part / Cluster / Module names and titles, contract-bound DSL markers, headers, field names, ids, and staged status tokens in canonical English form."
      : null,
    params.stage === "diagram_modules"
      ? "- Localize only descriptive prose such as Purpose, Responsibility, notes, assumptions / open questions, and user-facing artifact notes."
      : null,
  ];
  return lines.filter((entry): entry is string => Boolean(entry)).join("\n");
};

export const buildLocalizedWorkflowLanguageBlock = (params: {
  readonly artifactLanguage: string | undefined;
  readonly chatLanguage: string | undefined;
  readonly stage: WorkflowStageId;
}): string | null => {
  if (!isRussian(params.chatLanguage)) {
    return null;
  }
  const normalizedChatLanguage =
    normalizeRuntimeLanguage(params.chatLanguage) ?? DEFAULT_CHAT_LANGUAGE;
  const normalizedArtifactLanguage = normalizeArtifactLanguage(
    params.artifactLanguage ?? DEFAULT_ARTIFACT_LANGUAGE
  );
  const lines = [
    "Локализованный пакет инструкций CodeAI Hub (ru):",
    `- Общайся с пользователем на языке \`${normalizedChatLanguage}\`, как указано в Settings > General > Reasoning.`,
    `- Заполняй описательный текст артефакта на языке \`${normalizedArtifactLanguage}\`, как указано в Settings > General > Artifacts for the User.`,
    "- Английские internal instructions, examples и templates являются только форматом; не делай из них вывод, что ответ или артефакт должны быть на английском.",
    "- Не переводи code identifiers, canonical headings, field names, ids, statuses, DSL markers, file names, HTML comments и structural tokens.",
    "- Во время автоматического draft-pass используй только этот prompt и runtime-provided inline source documents; чтение других файлов разрешено только после явного запроса или разрешения пользователя.",
    params.stage === "diagram_modules"
      ? "- Для Diagram Modules держи Product Part / Cluster / Module titles, DSL markers, headers, field names, ids и staged status tokens в canonical English; локализуй только Purpose, Responsibility, notes, assumptions / open questions и другой описательный текст."
      : null,
  ];
  return lines.filter((entry): entry is string => Boolean(entry)).join("\n");
};

export const buildRuntimeLanguageReminder = (params: {
  readonly artifactLanguage: string | undefined;
  readonly chatLanguage: string | undefined;
}): string => {
  const normalizedChatLanguage =
    normalizeRuntimeLanguage(params.chatLanguage) ?? DEFAULT_CHAT_LANGUAGE;
  const normalizedArtifactLanguage = normalizeArtifactLanguage(
    params.artifactLanguage ?? DEFAULT_ARTIFACT_LANGUAGE
  );
  return `Final language reminder: user-facing chat stays in \`${normalizedChatLanguage}\`; artifact prose stays in \`${normalizedArtifactLanguage}\`; English examples/templates are format-only.`;
};
