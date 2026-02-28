export type WorkflowStageId =
  | "description"
  | "virtual_simulation"
  | "diagram_modules"
  | "diagram_facades";

type WorkflowPromptPackInput = {
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
  diagram_modules: "modules-diagram.mmd",
  diagram_facades: "facades-graph.mmd",
};

const WORKFLOW_STAGE_LABELS: Record<WorkflowStageId, string> = {
  description: "Description",
  virtual_simulation: "Virtual Simulation",
  diagram_modules: "Diagram Modules",
  diagram_facades: "Diagram Facades",
};

const RUN_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const NON_ALPHANUMERIC_RE = /[^a-zA-Z0-9]/g;
const MULTIPLE_DASHES_RE = /-+/g;
const TRAILING_DASH_RE = /-$/;

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

const resolveAgentRoleSlug = (role: string | null): string => {
  const normalized = role ? sanitizeSlugToken(role.trim().toLowerCase()) : "";
  if (normalized.length === 0) {
    return "agent";
  }
  if (normalized === "reviewer" || normalized === "collector") {
    return normalized;
  }
  return normalized;
};

export const buildDescriptionCollectorRunSlug = (
  providerId: string,
  sessionId: string
): string =>
  sanitizeSlugToken(
    `${resolveProviderSlug(providerId)}-${sanitizeSlugToken(
      sessionId.trim().toLowerCase()
    )}-${resolveAgentRoleSlug("description")}`
  );

const resolveRunSlug = (value: string | undefined): string | null => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
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

const resolveWorkflowArtifactPaths = (params: {
  readonly stage: WorkflowStageId;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly runSlug?: string;
}): WorkflowArtifactPaths => {
  const fileName = WORKFLOW_STAGE_FILES[params.stage];
  const runSlug =
    params.stage === "description" ? null : resolveRunSlug(params.runSlug);
  const runSegment = runSlug ? `runs/${runSlug}/` : "";
  const relativePath = normalizeRelativePath(
    `.codeai-hub/${params.workspaceSlug}/${params.stage}/${runSegment}${fileName}`
  );
  return {
    relativePath,
    absolutePath: joinPath(params.workspacePath, relativePath),
    fileName,
  };
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
  const defaultPrompt =
    params.stage === "virtual_simulation"
      ? "Собери артефакт на основе `Final_Description.md` и шаблона."
      : "Собери артефакт на основе анкеты и шаблона.";
  const prompt = params.prompt.trim().length ? params.prompt.trim() : defaultPrompt;

  const primaryInputLines =
    params.stage === "virtual_simulation"
      ? (() => {
          const finalRelativePath = normalizeRelativePath(
            `.codeai-hub/${params.workspaceSlug}/description/Final_Description.md`
          );
          const finalAbsolutePath = joinPath(params.workspacePath, finalRelativePath);
          return [
            `Final_Description.md (relative): \`${finalRelativePath}\``,
            `Final_Description.md (absolute): \`${finalAbsolutePath}\``,
          ];
        })()
      : (() => {
          const questionnaireRelativePath = normalizeRelativePath(params.questionnairePath);
          const questionnaireAbsolutePath = joinPath(
            params.workspacePath,
            questionnaireRelativePath
          );
          return [
            `Анкета (relative): \`${questionnaireRelativePath}\``,
            `Анкета (absolute): \`${questionnaireAbsolutePath}\``,
          ];
        })();
  const instructionLines = [
    `Этап: ${WORKFLOW_STAGE_LABELS[params.stage]}.`,
    `Целевой путь (relative): \`${relativePath}\``,
    `Целевой путь (absolute): \`${absolutePath}\``,
    ...primaryInputLines,
    params.templatePath
      ? `Шаблон (absolute): \`${params.templatePath}\``
      : null,
  ];
  const instructions = instructionLines
    .filter((entry): entry is string => Boolean(entry))
    .join("\n");

  return {
    content: [
      prompt,
      instructions,
      `Имя выходного файла: \`${fileName}\``,
    ]
      .filter((entry): entry is string => Boolean(entry))
      .join("\n\n"),
    relativePath,
    absolutePath,
  };
};
