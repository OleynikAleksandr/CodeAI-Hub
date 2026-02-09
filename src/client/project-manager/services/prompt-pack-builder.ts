export type WorkflowStageId =
  | "description"
  | "virtual_simulation"
  | "diagram_modules"
  | "diagram_facades";

type WorkflowPromptPackInput = {
  readonly stage: WorkflowStageId;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
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
  description: "description.md",
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

const normalizeRelativePath = (value: string): string => {
  const normalized = value.replace(/\\/g, "/").trim();
  if (normalized.startsWith("./")) {
    return normalized.slice(2);
  }
  return normalized;
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
}): WorkflowArtifactPaths => {
  const fileName = WORKFLOW_STAGE_FILES[params.stage];
  const relativePath = normalizeRelativePath(
    `.codeai-hub/${params.workspaceSlug}/${params.stage}/${fileName}`
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
  });
  const prompt = params.prompt.trim().length
    ? params.prompt.trim()
    : "Собери артефакт на основе анкеты и шаблона.";
  const questionnaireAbsolutePath = joinPath(
    params.workspacePath,
    normalizeRelativePath(params.questionnairePath)
  );
  const instructionLines = [
    `Этап: ${WORKFLOW_STAGE_LABELS[params.stage]}.`,
    `Целевой путь (relative): \`${relativePath}\``,
    `Целевой путь (absolute): \`${absolutePath}\``,
    `Анкета (relative): \`${normalizeRelativePath(params.questionnairePath)}\``,
    `Анкета (absolute): \`${questionnaireAbsolutePath}\``,
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
