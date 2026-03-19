import path from "node:path";

const AGENT_ROOT_PATH = path.resolve(__dirname, "../../../../agents");

export const resolveDiagramAgentAssetPath = (
  agentName: string,
  assetFileName: string
): string => path.join(AGENT_ROOT_PATH, agentName, "assets", assetFileName);

const resolveSyncedDiagramTemplateCandidates = (
  templateRelativePath: string,
  fallbackAgentName: string,
  fallbackAssetFileName: string
): readonly string[] => [
  templateRelativePath,
  resolveDiagramAgentAssetPath(fallbackAgentName, fallbackAssetFileName),
];

export const DIAGRAM_MODULES_PROMPT_APPENDIX_PATHS = [
  ...resolveSyncedDiagramTemplateCandidates(
    "diagram_modules/module-inventory-field-reference.md",
    "diagram-modules-agent",
    "module-inventory-field-reference.md"
  ),
  ...resolveSyncedDiagramTemplateCandidates(
    "diagram_modules/module-inventory-merge-rules.md",
    "diagram-modules-agent",
    "module-inventory-merge-rules.md"
  ),
] as const;

export const DIAGRAM_FACADES_PROMPT_APPENDIX_PATHS = [
  ...resolveSyncedDiagramTemplateCandidates(
    "diagram_facades/facade-map-field-reference.md",
    "diagram-facades-agent",
    "facade-map-field-reference.md"
  ),
  ...resolveSyncedDiagramTemplateCandidates(
    "diagram_facades/facade-map-merge-rules.md",
    "diagram-facades-agent",
    "facade-map-merge-rules.md"
  ),
] as const;

export const appendDiagramPromptAppendix = (
  prompt: string,
  promptAppendix: readonly string[]
): string =>
  promptAppendix.length > 0
    ? [
        prompt,
        "The following references are mandatory for valid Markdown-DSL output. Do not invent enum values or field names outside them.",
        ...promptAppendix,
      ].join("\n\n")
    : prompt;
