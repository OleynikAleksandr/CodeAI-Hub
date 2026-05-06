import {
  buildLocalizedWorkflowLanguageBlock,
  buildRuntimeLanguageBlock,
  buildRuntimeLanguageReminder,
  normalizeRuntimeLanguage,
} from "./prompt-localized-instructions";

export type WorkflowStageId =
  | "description"
  | "virtual_simulation"
  | "diagram_modules"
  | "application_skeleton"
  | "quality_gates";

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
  application_skeleton: "application-skeleton.md",
  quality_gates: "quality-gates.md",
};

const WORKFLOW_STAGE_LABELS: Record<WorkflowStageId, string> = {
  description: "Description",
  virtual_simulation: "Virtual Simulation",
  diagram_modules: "Diagram Modules",
  application_skeleton: "Application Skeleton",
  quality_gates: "Quality Gates Baseline",
};
const DEFAULT_STAGE_PROMPTS: Record<WorkflowStageId, string> = {
  description: "Build the artifact from the questionnaire and template.",
  virtual_simulation: "Build the artifact from `Final_Description.md`.",
  diagram_modules:
    "Build the staged artifact from `Final_Description.md` and `virtual-simulation.md`.",
  application_skeleton:
    "Build the application skeleton contract from the accepted Diagram Modules artifacts.",
  quality_gates:
    "Build the quality gates baseline from the accepted Application Skeleton contract.",
};

const DIAGRAM_STAGE_INPUT_LABELS: Partial<Record<WorkflowStageId, string>> = {
  diagram_modules: "Source artifact",
};

const RUN_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const NON_ALPHANUMERIC_RE = /[^a-zA-Z0-9]/g;
const MULTIPLE_DASHES_RE = /-+/g;
const TRAILING_DASH_RE = /-$/;

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
    "en"
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
    const finalRelativePath = `.codeai-hub/${params.workspaceSlug}/description/Final_Description.md`;
    const finalAbsolutePath = joinPath(params.workspacePath, finalRelativePath);
    return [
      `Final_Description.md (relative): \`${finalRelativePath}\``,
      `Final_Description.md (absolute): \`${finalAbsolutePath}\``,
    ];
  }
  if (params.stage === "diagram_modules") {
    const finalRelativePath = `.codeai-hub/${params.workspaceSlug}/description/Final_Description.md`;
    const finalAbsolutePath = joinPath(params.workspacePath, finalRelativePath);
    const simulationRelativePath = `.codeai-hub/${params.workspaceSlug}/virtual_simulation/virtual-simulation.md`;
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
  if (params.stage === "application_skeleton") {
    const finalRelativePath = `.codeai-hub/${params.workspaceSlug}/description/Final_Description.md`;
    const simulationRelativePath = `.codeai-hub/${params.workspaceSlug}/virtual_simulation/virtual-simulation.md`;
    const modulesRelativePath = `.codeai-hub/${params.workspaceSlug}/diagram_modules/product-parts.index.md`;
    return [
      `Final_Description.md (relative): \`${finalRelativePath}\``,
      `virtual-simulation.md (relative): \`${simulationRelativePath}\``,
      `product-parts.index.md (relative): \`${modulesRelativePath}\``,
      `Product Part files (pattern): \`.codeai-hub/${params.workspaceSlug}/diagram_modules/product-parts/<part-id>.md\``,
    ];
  }
  if (params.stage === "quality_gates") {
    const skeletonRelativePath = `.codeai-hub/${params.workspaceSlug}/application_skeleton/application-skeleton.md`;
    const mapRelativePath = `.codeai-hub/${params.workspaceSlug}/application_skeleton/application-skeleton-map.json`;
    return [
      `application-skeleton.md (relative): \`${skeletonRelativePath}\``,
      `application-skeleton-map.json (relative): \`${mapRelativePath}\``,
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
  if (stage === "application_skeleton") {
    return [
      "Work phases:",
      "- Phase 1: confirm the selected stack or ask focused stack questions before writing scaffold files.",
      "- Phase 2: create the minimal industry-standard project skeleton only after the stack and repo shape are clear.",
      `- Phase 3: write \`${targetFileName}\` and \`application-skeleton-map.json\` as the accepted skeleton contract candidates.`,
      "- Phase 4: do not create Product Part, Cluster, or Module sessions.",
    ];
  }
  if (stage === "quality_gates") {
    return [
      "Work phases:",
      "- Phase 1: read the accepted Application Skeleton artifacts.",
      "- Phase 2: define executable build, typecheck, lint/format, test, and architecture commands for the selected stack.",
      `- Phase 3: write \`${targetFileName}\` and \`quality-gates.json\` as the gate contract candidates.`,
      "- Phase 4: do not implement product features.",
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

const buildArtifactEditOperationBlock = (): string =>
  [
    "Artifact edit operation:",
    "- For Markdown artifacts, prefer the provider-native patch/edit operation against the target context; for Codex, use `apply_patch` when available.",
    "- Do not choose fallback scripts as the first approach for ordinary Markdown edits.",
    "- For `<!-- agent-fill -->` blocks, replace only the intended block body and preserve frontmatter, generated blocks, sentinels, and LF line endings.",
    "- When the block contains `_CODEAI_AGENT_FILL_SENTINEL: replace this line with draft content._`, replace that sentinel line through the patch/edit operation.",
    "- If patch context needs adjustment because of blank lines or sentinel differences, retry silently with exact local context.",
    "- Do not send user-facing progress updates about patch mismatch, invisible blank lines, line-by-line checks, or fallback script rewrites unless the edit is blocked.",
  ].join("\n");

const shouldIncludeTemplateHint = (
  stage: WorkflowStageId,
  templatePath: string | undefined
): templatePath is string =>
  stage === "description" && Boolean(templatePath);

const buildAdditionalArtifactLines = (params: {
  readonly stage: WorkflowStageId;
  readonly workspaceSlug: string;
}): readonly string[] => {
  if (params.stage === "diagram_modules") {
    return [
      "Additional staged artifacts for this step are allowed and expected by the runtime:",
      `- Product Part files (pattern): \`.codeai-hub/${params.workspaceSlug}/diagram_modules/product-parts/<part-id>.md\``,
      `- Layout sidecar (runtime-owned): \`.codeai-hub/${params.workspaceSlug}/diagram_modules/module-map.flow.json\``,
    ];
  }
  if (params.stage === "application_skeleton") {
    return [
      "Additional skeleton artifacts for this step are allowed and expected by the runtime:",
      `- Skeleton map JSON: \`.codeai-hub/${params.workspaceSlug}/application_skeleton/application-skeleton-map.json\``,
    ];
  }
  if (params.stage === "quality_gates") {
    return [
      "Additional quality gate artifacts for this step are allowed and expected by the runtime:",
      `- Quality gates JSON: \`.codeai-hub/${params.workspaceSlug}/quality_gates/quality-gates.json\``,
    ];
  }
  return [];
};

export const buildWorkflowPromptPack = (
  params: WorkflowPromptPackInput
): WorkflowPromptPack => {
  const { relativePath, absolutePath, fileName } = resolveWorkflowArtifactPaths({
    stage: params.stage,
    workspacePath: params.workspacePath,
    workspaceSlug: params.workspaceSlug,
    runSlug: params.runSlug,
  });
  const additionalArtifacts = buildAdditionalArtifactLines(params);

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
      buildLocalizedWorkflowLanguageBlock({
        artifactLanguage: params.artifactLanguage,
        chatLanguage: params.chatLanguage,
        stage: params.stage,
      }),
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
      buildArtifactEditOperationBlock(),
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
