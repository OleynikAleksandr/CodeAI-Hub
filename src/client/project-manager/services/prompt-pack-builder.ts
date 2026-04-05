export type WorkflowStageId =
  | "description"
  | "virtual_simulation"
  | "diagram_modules"
  | "application_foundation_envelope";

type WorkflowPromptPackInput = {
  readonly artifactLanguage?: string;
  readonly stage: WorkflowStageId;
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

const WORKFLOW_STAGE_FILES: Record<WorkflowStageId, string> = {
  description: "Final_Description.md",
  virtual_simulation: "virtual-simulation.md",
  diagram_modules: "product-parts.index.md",
  application_foundation_envelope: "application-foundation-envelope.md",
};

const WORKFLOW_STAGE_LABELS: Record<WorkflowStageId, string> = {
  description: "Description",
  virtual_simulation: "Virtual Simulation",
  diagram_modules: "Diagram Modules",
  application_foundation_envelope: "Application Foundation Envelope",
};
const DEFAULT_ARTIFACT_LANGUAGE = "en";
const LEGACY_SOURCE_LANGUAGE = "source";

const DEFAULT_STAGE_PROMPTS: Record<WorkflowStageId, string> = {
  description: "Build the artifact from the questionnaire and template.",
  virtual_simulation: "Build the artifact from `Final_Description.md`.",
  diagram_modules:
    "Build the staged artifact from `Final_Description.md` and `virtual-simulation.md`.",
  application_foundation_envelope:
    "Build the artifact from `Final_Description.md`, `virtual-simulation.md`, and the staged `Diagram Modules` artifacts.",
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
  if (params.stage === "application_foundation_envelope") {
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
    const productPartsIndexRelativePath = normalizeRelativePath(
      `.codeai-hub/${params.workspaceSlug}/diagram_modules/product-parts.index.md`
    );
    const productPartsIndexAbsolutePath = joinPath(
      params.workspacePath,
      productPartsIndexRelativePath
    );
    return [
      `Final_Description.md (relative): \`${finalRelativePath}\``,
      `Final_Description.md (absolute): \`${finalAbsolutePath}\``,
      `virtual-simulation.md (relative): \`${simulationRelativePath}\``,
      `virtual-simulation.md (absolute): \`${simulationAbsolutePath}\``,
      `product-parts.index.md (relative): \`${productPartsIndexRelativePath}\``,
      `product-parts.index.md (absolute): \`${productPartsIndexAbsolutePath}\``,
      `Product Part files (pattern): \`.codeai-hub/${params.workspaceSlug}/diagram_modules/product-parts/<part-id>.md\``,
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
      `- Phase 1: read \`Final_Description.md\` and \`virtual-simulation.md\`, then create or update \`${targetFileName}\` as the canonical index of \`Product Part\` entries, their order, and purpose.`,
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

const buildArtifactLanguageBlock = (
  stage: WorkflowStageId,
  artifactLanguage: string | undefined
): string => {
  const normalizedArtifactLanguage =
    normalizeArtifactLanguage(artifactLanguage ?? DEFAULT_ARTIFACT_LANGUAGE);
  const lines = [
    "Artifacts for the User language (runtime directive):",
    `- Target language code: \`${normalizedArtifactLanguage}\`.`,
    `- Write the final user-facing artifact and brief user-facing chat updates in \`${normalizedArtifactLanguage}\`.`,
    "- Do not rewrite internal instructions to match this language.",
    stage === "diagram_modules"
      ? "- Keep contract-bound DSL markers, headers, field names, ids, and staged status tokens in canonical form."
      : null,
  ];
  return lines.filter((entry): entry is string => Boolean(entry)).join("\n");
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
      prompt,
      buildArtifactLanguageBlock(params.stage, params.artifactLanguage),
      buildChangeSummaryBlock(params.stage),
      instructions,
      `Output file name: \`${fileName}\``,
    ]
      .filter((entry): entry is string => Boolean(entry))
      .join("\n\n"),
    relativePath,
    absolutePath,
  };
};
