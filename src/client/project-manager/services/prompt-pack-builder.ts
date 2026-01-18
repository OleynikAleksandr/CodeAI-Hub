export type WorkflowStageId =
  | "description"
  | "virtual_simulation"
  | "diagram_modules"
  | "diagram_facades";

type WorkflowPromptPackInput = {
  readonly stage: WorkflowStageId;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly runSlug: string;
  readonly prompt: string;
  readonly template: string;
  readonly questionnairePath: string;
  readonly questionnaireContent: string;
  readonly questionnaireTruncated: boolean;
  readonly questionnaireMaxBytes: number;
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
  readonly runSlug: string;
}): WorkflowArtifactPaths => {
  const fileName = WORKFLOW_STAGE_FILES[params.stage];
  const relativePath = normalizeRelativePath(
    `.codeai-hub/${params.workspaceSlug}/${params.stage}/runs/${params.runSlug}/${fileName}`
  );
  return {
    relativePath,
    absolutePath: joinPath(params.workspacePath, relativePath),
    fileName,
  };
};

const buildFileBlock = (params: {
  readonly path: string;
  readonly content: string;
  readonly truncated?: boolean;
  readonly maxBytes?: number;
}): string => {
  const truncationNote = params.truncated
    ? `\n(файл обрезан до ${params.maxBytes ?? 0} байт)`
    : "";
  return `\n[FILE: ${params.path}]${truncationNote}\n\`\`\`\n${params.content}\n\`\`\``;
};

const buildQuestionnaireSection = (params: {
  readonly path: string;
  readonly content: string;
  readonly truncated: boolean;
  readonly maxBytes: number;
}): string => {
  if (params.content.trim().length === 0) {
    return [
      "Анкета недоступна в prompt pack.",
      `Прочти файл по пути: \`${params.path}\`.`,
    ].join("\n");
  }
  return buildFileBlock({
    path: params.path,
    content: params.content,
    truncated: params.truncated,
    maxBytes: params.maxBytes,
  });
};

const buildTemplateSection = (params: {
  readonly fileName: string;
  readonly template: string;
}): string => {
  if (params.template.trim().length === 0) {
    return "Шаблон не найден. Сформируй артефакт в свободной форме.";
  }
  return buildFileBlock({ path: params.fileName, content: params.template });
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
  const prompt = params.prompt.trim().length
    ? params.prompt.trim()
    : "Собери артефакт на основе анкеты и шаблона.";
  const instructions = [
    `Этап: ${WORKFLOW_STAGE_LABELS[params.stage]}.`,
    "Не используй structured output — записывай результат файлом.",
    "Если нужны уточнения, задай вопросы и дождись OK/approve перед записью.",
    `Целевой путь (relative): \`${relativePath}\``,
    `Целевой путь (absolute): \`${absolutePath}\``,
  ].join("\n");
  const questionnaireSection = buildQuestionnaireSection({
    path: params.questionnairePath,
    content: params.questionnaireContent,
    truncated: params.questionnaireTruncated,
    maxBytes: params.questionnaireMaxBytes,
  });
  const templateSection = buildTemplateSection({
    fileName,
    template: params.template,
  });

  return {
    content: [
      prompt,
      instructions,
      "Анкета:",
      questionnaireSection,
      "Шаблон артефакта:",
      templateSection,
    ].join("\n\n"),
    relativePath,
    absolutePath,
  };
};
