export type WorkflowStageId =
  | "description"
  | "virtual_simulation"
  | "diagram_modules";

type WorkflowPromptPackInput = {
  readonly artifactLanguage?: string;
  readonly chatLanguage?: string;
  readonly stage: WorkflowStageId;
  readonly sourceArtifacts?: readonly WorkflowSourceArtifact[];
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly runSlug?: string;
  readonly prompt: string;
  readonly questionnairePath: string;
  readonly templatePath?: string;
};

type WorkflowPromptPack = {
  readonly content: string;
  readonly relativePath: string;
  readonly absolutePath: string;
};

type WorkflowArtifactPaths = {
  readonly relativePath: string;
  readonly absolutePath: string;
  readonly fileName: string;
};

type WorkflowSourceArtifact = {
  readonly content: string;
  readonly label: string;
  readonly relativePath: string;
  readonly truncated?: boolean;
};

const WORKFLOW_STAGE_FILES: Record<WorkflowStageId, string> = {
  description: "Final_Description.md",
  virtual_simulation: "virtual-simulation.md",
  diagram_modules: "product-parts.index.md",
};

const WORKFLOW_STAGE_LABELS: Record<WorkflowStageId, string> = {
  description: "Description",
  virtual_simulation: "Virtual Simulation",
  diagram_modules: "Diagram Modules",
};
const DEFAULT_ARTIFACT_LANGUAGE = "en";
const DEFAULT_CHAT_LANGUAGE = "en";
const LEGACY_SOURCE_LANGUAGE = "source";

const DEFAULT_STAGE_PROMPTS: Record<WorkflowStageId, string> = {
  description: "Build the artifact from the questionnaire and template.",
  virtual_simulation: "Build the artifact from `Final_Description.md`.",
  diagram_modules:
    "Build the staged artifact from `Final_Description.md` and `virtual-simulation.md`.",
};

const DIAGRAM_STAGE_INPUT_LABELS: Partial<Record<WorkflowStageId, string>> = {
  diagram_modules: "Source artifact",
};

const RUN_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const NON_ALPHANUMERIC_RE = /[^a-zA-Z0-9]/g;
const MULTIPLE_DASHES_RE = /-+/g;
const TRAILING_DASH_RE = /-$/;

const normalizeArtifactLanguage = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return DEFAULT_ARTIFACT_LANGUAGE;
  }
  return normalized === LEGACY_SOURCE_LANGUAGE
    ? DEFAULT_ARTIFACT_LANGUAGE
    : normalized;
};

const normalizeRuntimeLanguage = (value: unknown): string | null => {
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

const isRecordValue = (
  value: unknown
): value is Readonly<Record<string, unknown>> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const resolveWorkflowChatLanguage = (
  payload: unknown
): string => {
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

const normalizeRelativePath = (value: string): string => {
  const normalized = value.replace(/\\/g, "/").trim();
  if (normalized.startsWith("./")) {
    return normalized.slice(2);
  }
  return normalized;
};

const sanitizeSlugToken = (input: string): string => {
  const normalized = input
    .replace(NON_ALPHANUMERIC_RE, "-")
    .replace(MULTIPLE_DASHES_RE, "-")
    .replace(TRAILING_DASH_RE, "")
    .trim();
  return normalized.length > 0 ? normalized : "default-workspace";
};

const resolveProviderSlug = (providerId: string): string => {
  const normalized = sanitizeSlugToken(providerId.trim().toLowerCase());
  if (normalized === "codexcli") {
    return "codex";
  }
  if (normalized === "claudecodecli") {
    return "claude";
  }
  if (normalized === "geminicli") {
    return "gemini";
  }
  return normalized;
};

const resolveRunSlug = (value: string | undefined): string | null => {
  const trimmed = value?.trim() ?? "";
  return RUN_SLUG_RE.test(trimmed) ? trimmed : null;
};

const joinPath = (base: string, relative: string): string => {
  const separator = base.includes("\\") ? "\\" : "/";
  const trimmedBase = base.endsWith(separator)
    ? base.slice(0, -1)
    : base;
  const cleanedRelative = relative.startsWith("/")
    ? relative.slice(1)
    : relative;
  return `${trimmedBase}${separator}${cleanedRelative}`;
};

const buildWorkflowRelativePath = (params: {
  readonly workspaceSlug: string;
  readonly stage: WorkflowStageId;
  readonly fileName: string;
  readonly runSlug?: string;
}): string => {
  const runSlug =
    params.stage === "description" ? null : resolveRunSlug(params.runSlug);
  const runSegment = runSlug ? `runs/${runSlug}/` : "";
  return normalizeRelativePath(
    `.codeai-hub/${params.workspaceSlug}/${params.stage}/${runSegment}${params.fileName}`
  );
};

const resolveWorkflowArtifactPaths = (params: {
  readonly stage: WorkflowStageId;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly runSlug?: string;
}): WorkflowArtifactPaths => {
  const fileName = WORKFLOW_STAGE_FILES[params.stage];
  const relativePath = buildWorkflowRelativePath({
    workspaceSlug: params.workspaceSlug,
    stage: params.stage,
    fileName,
    runSlug: params.runSlug,
  });
  return {
    relativePath,
    absolutePath: joinPath(params.workspacePath, relativePath),
    fileName,
  };
};

const buildStageInputLines = (params: {
  readonly stage: WorkflowStageId;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly questionnairePath: string;
}): readonly string[] => {
  if (params.stage === "virtual_simulation") {
    const finalRelativePath = normalizeRelativePath(
      `.codeai-hub/${params.workspaceSlug}/description/Final_Description.md`
    );
    const finalAbsolutePath = joinPath(params.workspacePath, finalRelativePath);
    return [
      `Final_Description.md (relative): \`${finalRelativePath}\``,
      `Final_Description.md (absolute): \`${finalAbsolutePath}\``,
    ];
  }
  if (params.stage === "diagram_modules") {
    const finalRelativePath = normalizeRelativePath(
      `.codeai-hub/${params.workspaceSlug}/description/Final_Description.md`
    );
    const finalAbsolutePath = joinPath(params.workspacePath, finalRelativePath);
    const simulationRelativePath = normalizeRelativePath(
      `.codeai-hub/${params.workspaceSlug}/virtual_simulation/virtual-simulation.md`
    );
    const simulationAbsolutePath = joinPath(
      params.workspacePath,
      simulationRelativePath
    );
    return [
      `Final_Description.md (relative): \`${finalRelativePath}\``,
      `Final_Description.md (absolute): \`${finalAbsolutePath}\``,
      `virtual-simulation.md (relative): \`${simulationRelativePath}\``,
      `virtual-simulation.md (absolute): \`${simulationAbsolutePath}\``,
    ];
  }
  const questionnaireRelativePath = normalizeRelativePath(params.questionnairePath);
  const questionnaireAbsolutePath = joinPath(
    params.workspacePath,
    questionnaireRelativePath
  );
  const label = DIAGRAM_STAGE_INPUT_LABELS[params.stage] ?? "Questionnaire";
  return [
    `${label} (relative): \`${questionnaireRelativePath}\``,
    `${label} (absolute): \`${questionnaireAbsolutePath}\``,
  ];
};

const buildStagePhaseLines = (
  stage: WorkflowStageId,
  targetFileName: string
): readonly string[] => {
  if (stage === "diagram_modules") {
    return [
      "Work phases:",
      `- Phase 1: read the runtime-provided \`Final_Description.md\` and \`virtual-simulation.md\` inputs, then write \`${targetFileName}\` as the canonical index of \`Product Part\` entries, their order, and purpose.`,
      "- Phase 2: if the runtime launches a continuation subturn (hidden by default), work on only one target `Product Part`, materialize one `product-parts/<part-id>.md` per iteration, do not wait for a user-visible `Continue`, and do not silently generate the whole giant inventory in one go.",
      "- Phase 3: relation lines and cross-part wiring are not required for the first useful result; stabilize the ownership structure `Product Part -> Cluster -> Module` first.",
      "- Phase 4: the visual graph and `module-map.flow.json` are maintained separately by the runtime.",
      "- Phase 5: do not spend the current turn searching for staged examples, continuity files, helper artifacts, or generic template files unless they are explicitly listed above as inputs for this turn.",
    ];
  }
  return [];
};

const buildChangeSummaryBlock = (stage: WorkflowStageId): string | null => {
  if (stage !== "diagram_modules") {
    return null;
  }
  return [
    "Change Summary (generated by runtime):",
    "- Preserve user-added entities and user-modified fields.",
    "- Do not silently recreate entities removed by the user.",
    "- If no agent baseline exists yet, treat the current diagram as user-authored context.",
  ].join("\n");
};

const buildInlineSourceArtifactBlock = (params: {
  readonly sourceArtifacts: readonly WorkflowSourceArtifact[] | undefined;
  readonly stage: WorkflowStageId;
  readonly workspacePath: string;
}): string | null => {
  if (params.stage === "diagram_modules" && !params.sourceArtifacts?.length) {
    return null;
  }
  const sourceArtifacts = params.sourceArtifacts ?? [];
  if (!sourceArtifacts.length) {
    return [
      "Authoritative upstream source documents (inline):",
      "- Inline upstream source content was not available for this turn.",
      "- Before drafting, read the relative or absolute source paths listed below and treat those files as authoritative.",
    ].join("\n");
  }
  return [
    "Authoritative upstream source documents (inline):",
    "- Treat the fenced content below as authoritative for this turn.",
    "- The listed paths are provenance and fallback references if inline content appears missing or stale.",
    ...sourceArtifacts.flatMap((artifact) => {
      const absolutePath = joinPath(params.workspacePath, artifact.relativePath);
      const content = artifact.content.endsWith("\n")
        ? artifact.content
        : `${artifact.content}\n`;
      return [
        "",
        `### ${artifact.label}`,
        `- Relative path: \`${artifact.relativePath}\``,
        `- Absolute path: \`${absolutePath}\``,
        artifact.truncated
          ? "- Warning: inline content was truncated by the runtime. Read the source path before making decisions that depend on omitted content."
          : "- Inline content: complete runtime read.",
        "````markdown",
        content,
        "````",
      ];
    }),
  ].join("\n");
};

const buildRuntimeLanguageBlock = (params: {
  readonly artifactLanguage: string | undefined;
  readonly chatLanguage: string | undefined;
  readonly stage: WorkflowStageId;
}): string => {
  const normalizedChatLanguage =
    normalizeRuntimeLanguage(params.chatLanguage) ?? DEFAULT_CHAT_LANGUAGE;
  const normalizedArtifactLanguage =
    normalizeArtifactLanguage(params.artifactLanguage ?? DEFAULT_ARTIFACT_LANGUAGE);
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

const buildWorkflowArtifactModeBlock = (params: {
  readonly relativePath: string;
  readonly stage: WorkflowStageId;
}): string => {
  const stagedTargetLine =
    params.stage === "diagram_modules"
      ? "- Diagram Modules continuation turns must receive a new runtime prompt with `Mode: continue_existing_artifact` and the exact target `product-parts/<part-id>.md`."
      : null;
  const lines = [
    "Workflow artifact mode:",
    "- Mode: `create_initial_draft`.",
    `- Target artifact: \`${params.relativePath}\`.`,
    "- Write the target artifact directly from the current prompt and runtime-provided inputs.",
    "- Do not search for, read, or check whether the target artifact already exists.",
    "- If existing artifact content is relevant, it must be included in this prompt as runtime-provided artifact context.",
    stagedTargetLine,
  ];
  return lines.filter((entry): entry is string => Boolean(entry)).join("\n");
};

const buildRuntimeToolingFactsBlock = (workspacePath: string): string =>
  [
    "Runtime tooling facts:",
    `- Runtime workspace path: \`${workspacePath}\`.`,
    "- When shell tools are available, CodeAI Hub starts them in the workspace context for this session.",
    "- Python command: `python3`.",
    "- Node command: `node`.",
    "- Package manager command: `npm`.",
    "- Do not spend a turn probing these routine commands or announcing fallback messages such as `python is missing`; mention tooling only when a command actually fails and blocks the artifact update.",
  ].join("\n");

const buildArtifactWriteEncodingBlock = (): string =>
  [
    "Artifact write encoding:",
    "- Write Markdown artifacts as UTF-8 text and preserve normal LF line endings.",
    "- Cyrillic and other localized prose must be written directly as valid UTF-8, not escaped or transliterated.",
    "- Use the provider-native edit/write path when it preserves UTF-8; if a write path corrupts localized text, retry with a UTF-8-safe shell heredoc or equivalent exact-write method.",
    "- Do not send user-facing progress updates about routine encoding retries; mention encoding only if it remains a blocking artifact-write failure.",
  ].join("\n");

const buildRuntimeLanguageReminder = (params: {
  readonly artifactLanguage: string | undefined;
  readonly chatLanguage: string | undefined;
}): string => {
  const normalizedChatLanguage =
    normalizeRuntimeLanguage(params.chatLanguage) ?? DEFAULT_CHAT_LANGUAGE;
  const normalizedArtifactLanguage =
    normalizeArtifactLanguage(params.artifactLanguage ?? DEFAULT_ARTIFACT_LANGUAGE);
  return `Final language reminder: user-facing chat stays in \`${normalizedChatLanguage}\`; artifact prose stays in \`${normalizedArtifactLanguage}\`; English examples/templates are format-only.`;
};

const shouldIncludeTemplateHint = (
  stage: WorkflowStageId,
  templatePath: string | undefined
): templatePath is string =>
  stage === "description" && Boolean(templatePath);

export const buildWorkflowPromptPack = (
  params: WorkflowPromptPackInput
): WorkflowPromptPack => {
  const { relativePath, absolutePath, fileName } = resolveWorkflowArtifactPaths({
    stage: params.stage,
    workspacePath: params.workspacePath,
    workspaceSlug: params.workspaceSlug,
    runSlug: params.runSlug,
  });
  const additionalArtifacts: readonly string[] =
    params.stage === "diagram_modules"
      ? [
          "Additional staged artifacts for this step are allowed and expected by the runtime:",
          `- Product Part files (pattern): \`.codeai-hub/${params.workspaceSlug}/diagram_modules/product-parts/<part-id>.md\``,
          `- Layout sidecar (runtime-owned): \`.codeai-hub/${params.workspaceSlug}/diagram_modules/module-map.flow.json\``,
        ]
      : [];

  const defaultPrompt = DEFAULT_STAGE_PROMPTS[params.stage];
  const prompt = params.prompt.trim().length ? params.prompt.trim() : defaultPrompt;
  const primaryInputLines = buildStageInputLines({
    stage: params.stage,
    workspacePath: params.workspacePath,
    workspaceSlug: params.workspaceSlug,
    questionnairePath: params.questionnairePath,
  });
  const instructionLines = [
    `Stage: ${WORKFLOW_STAGE_LABELS[params.stage]}.`,
    `Target path (relative): \`${relativePath}\``,
    `Target path (absolute): \`${absolutePath}\``,
    ...primaryInputLines,
    shouldIncludeTemplateHint(params.stage, params.templatePath)
      ? `Template (absolute): \`${params.templatePath}\``
      : null,
    ...buildStagePhaseLines(params.stage, fileName),
    ...additionalArtifacts,
  ];
  const instructions = instructionLines
    .filter((entry): entry is string => Boolean(entry))
    .join("\n");

  return {
    content: [
      buildRuntimeLanguageBlock({
        artifactLanguage: params.artifactLanguage,
        chatLanguage: params.chatLanguage,
        stage: params.stage,
      }),
      prompt,
      buildWorkflowArtifactModeBlock({
        relativePath,
        stage: params.stage,
      }),
      buildRuntimeToolingFactsBlock(params.workspacePath),
      buildArtifactWriteEncodingBlock(),
      buildChangeSummaryBlock(params.stage),
      buildInlineSourceArtifactBlock({
        sourceArtifacts: params.sourceArtifacts,
        stage: params.stage,
        workspacePath: params.workspacePath,
      }),
      instructions,
      `Output file name: \`${fileName}\``,
      buildRuntimeLanguageReminder({
        artifactLanguage: params.artifactLanguage,
        chatLanguage: params.chatLanguage,
      }),
    ]
      .filter((entry): entry is string => Boolean(entry))
      .join("\n\n"),
    relativePath,
    absolutePath,
  };
};
