import type { DevelopmentTreeDetectedNode } from "./development-tree-node-detector";

export interface LocalizedNodePromptInstructionRequest {
  readonly artifactLanguage?: string;
  readonly draftFileNames: readonly string[];
  readonly node: DevelopmentTreeDetectedNode;
  readonly responseLanguage?: string;
}

const RUSSIAN_LANGUAGE_CODES = new Set(["ru", "ru-ru"]);

const normalizeLanguage = (value: string | undefined): string =>
  value?.trim().toLowerCase() || "en";

const isRussian = (value: string | undefined): boolean =>
  RUSSIAN_LANGUAGE_CODES.has(normalizeLanguage(value));

const createNodeLabel = (node: DevelopmentTreeDetectedNode): string => {
  if (node.kind === "product_part") {
    return "Product Part";
  }
  if (node.kind === "cluster") {
    return "Cluster";
  }
  return "Module";
};

export const createLocalizedNodePromptInstructionLines = (
  request: LocalizedNodePromptInstructionRequest
): readonly string[] => {
  if (!isRussian(request.responseLanguage)) {
    return [];
  }
  const artifactLanguage = normalizeLanguage(request.artifactLanguage);
  return [
    "Локализованный пакет инструкций CodeAI Hub (ru):",
    `- Ты отвечаешь за узел ${createNodeLabel(request.node)} \`${request.node.id}\`.`,
    `- Общайся с пользователем на языке \`${normalizeLanguage(request.responseLanguage)}\`, как указано в Settings > General > Reasoning.`,
    `- Заполняй описательный текст в draft-артефактах на языке \`${artifactLanguage}\`, как указано в Settings > General > Artifacts for the User.`,
    "- Английские названия файлов, ids, method/event names, status tokens, YAML keys, HTML comments, `agent-fill`, DSL markers, field names и structural headings являются защищёнными canonical tokens; не переводи их.",
    "- Даже в `ModuleFacadeContract.draft.md` и `ClusterFacadeContract.draft.md` пояснительный текст внутри `<!-- agent-fill -->` должен быть на языке артефактов; английскими остаются только canonical identifiers and method/event names.",
    "- Во время автоматического draft-pass используй только контекст из этого первого prompt и перечисленные target draft files; чтение других файлов разрешено только после явного запроса или разрешения пользователя.",
    `- Target draft files: ${request.draftFileNames.map((fileName) => `\`${fileName}\``).join(", ")}.`,
  ];
};
