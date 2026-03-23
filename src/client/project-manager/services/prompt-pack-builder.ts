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
  diagram_modules: "product-parts.index.md",
  diagram_facades: "facade-map.md",
};

const WORKFLOW_STAGE_LABELS: Record<WorkflowStageId, string> = {
  description: "Description",
  virtual_simulation: "Virtual Simulation",
  diagram_modules: "Diagram Modules",
  diagram_facades: "Diagram Facades",
};

const DIAGRAM_STAGE_INPUT_LABELS: Partial<Record<WorkflowStageId, string>> = {
  diagram_modules: "Исходный артефакт",
  diagram_facades: "Артефакт модулей",
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
  return normalized.length === 0 ? "agent" : normalized;
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
  const label = DIAGRAM_STAGE_INPUT_LABELS[params.stage] ?? "Анкета";
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
      "Фазы работы:",
      `- Phase 1: прочитай \`Final_Description.md\` и \`virtual-simulation.md\`, затем создай или обнови \`${targetFileName}\` как canonical index списка \`Product Part\`, их порядка и purpose.`,
      "- Phase 2: если runtime запускает continuation subturn (hidden by default), работай только с одним целевым `Product Part`, materialize-ь один `product-parts/<part-id>.md` за итерацию, не жди user-visible `Продолжай` и не пытайся молча генерировать весь giant inventory разом.",
      "- Phase 3: relation lines и cross-part wiring не являются обязательной частью первого полезного результата; сначала стабилизируй ownership structure `Product Part -> Cluster -> Module`.",
      "- Phase 4: `module-inventory.md` materialize-ится runtime как compatibility aggregate после завершения part-файлов; visual graph и `module-map.flow.json` тоже поддерживаются runtime отдельно.",
      "- Phase 5: если какой-либо старый prompt/template текст требует сначала писать прямой `module-inventory.md` или запрещает staged Markdown artifacts, считай это legacy-следом и следуй staged contract выше.",
      "- Phase 6: не трать текущий turn на поиск compatibility inventory, staged examples, continuity files, helper artifacts или generic template files, если они явно не перечислены выше как входы этого turn-а.",
    ];
  }
  if (stage === "diagram_facades") {
    return [
      "Фазы работы:",
      `- Phase 1: прочитай \`module-inventory.md\`, затем создай или обнови \`${targetFileName}\` как канонический facade map уже согласованных module boundaries.`,
      "- Phase 2: не переизобретай module ownership и не ищи дополнительные diagram artifacts вне текущих входов; переводи текущий inventory в user-readable facade map.",
      "- Phase 3: не трать текущий turn на поиск continuity files, helper artifacts, generic template files или legacy diagram directories, если они явно не перечислены выше как входы этого turn-а.",
    ];
  }
  return [];
};

const buildChangeSummaryBlock = (stage: WorkflowStageId): string | null => {
  if (stage !== "diagram_modules" && stage !== "diagram_facades") {
    return null;
  }
  return [
    "Change Summary (generated by runtime):",
    "- Preserve user-added entities and user-modified fields.",
    "- Do not silently recreate entities removed by the user.",
    "- If no agent baseline exists yet, treat the current diagram as user-authored context.",
  ].join("\n");
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
  const additionalArtifacts: readonly string[] =
    params.stage === "diagram_modules"
      ? [
          "Дополнительные staged артефакты этого шага разрешены и ожидаемы runtime:",
          `- Product Part files (pattern): \`.codeai-hub/${params.workspaceSlug}/diagram_modules/product-parts/<part-id>.md\``,
          `- Compatibility aggregate (runtime-owned, not a default input): \`.codeai-hub/${params.workspaceSlug}/diagram_modules/module-inventory.md\``,
          `- Layout sidecar (runtime-owned): \`.codeai-hub/${params.workspaceSlug}/diagram_modules/module-map.flow.json\``,
        ]
      : [];

  const defaultPrompt =
    params.stage === "virtual_simulation"
      ? "Собери артефакт на основе `Final_Description.md`."
      : "Собери артефакт на основе анкеты и шаблона.";
  const prompt = params.prompt.trim().length ? params.prompt.trim() : defaultPrompt;
  const primaryInputLines = buildStageInputLines({
    stage: params.stage,
    workspacePath: params.workspacePath,
    workspaceSlug: params.workspaceSlug,
    questionnairePath: params.questionnairePath,
  });
  const instructionLines = [
    `Этап: ${WORKFLOW_STAGE_LABELS[params.stage]}.`,
    `Целевой путь (relative): \`${relativePath}\``,
    `Целевой путь (absolute): \`${absolutePath}\``,
    ...primaryInputLines,
    params.stage !== "virtual_simulation" &&
    params.stage !== "diagram_modules" &&
    params.stage !== "diagram_facades" &&
    params.templatePath
      ? `Шаблон (absolute): \`${params.templatePath}\``
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
      buildChangeSummaryBlock(params.stage),
      instructions,
      `Имя выходного файла: \`${fileName}\``,
    ]
      .filter((entry): entry is string => Boolean(entry))
      .join("\n\n"),
    relativePath,
    absolutePath,
  };
};
