import path from "node:path";

const AGENT_ROOT_PATH = path.resolve(__dirname, "../../../../agents");

export const resolveDiagramAgentAssetPath = (
  agentName: string,
  assetFileName: string
): string => path.join(AGENT_ROOT_PATH, agentName, "assets", assetFileName);

export const resolveSyncedDiagramTemplateCandidates = (
  templateRelativePath: string,
  fallbackAgentName: string,
  fallbackAssetFileName: string
): readonly string[] => [
  templateRelativePath,
  resolveDiagramAgentAssetPath(fallbackAgentName, fallbackAssetFileName),
];

export const DIAGRAM_MODULES_PROMPT_APPENDIX_PATHS = [
  resolveSyncedDiagramTemplateCandidates(
    "diagram_modules/product-parts-index-template.md",
    "diagram-modules-agent",
    "product-parts-index-template.md"
  ),
  resolveSyncedDiagramTemplateCandidates(
    "diagram_modules/product-part-template.md",
    "diagram-modules-agent",
    "product-part-template.md"
  ),
  resolveSyncedDiagramTemplateCandidates(
    "diagram_modules/module-inventory-field-reference.md",
    "diagram-modules-agent",
    "module-inventory-field-reference.md"
  ),
  resolveSyncedDiagramTemplateCandidates(
    "diagram_modules/module-inventory-merge-rules.md",
    "diagram-modules-agent",
    "module-inventory-merge-rules.md"
  ),
] as const;

export const appendDiagramPromptAppendix = (
  prompt: string,
  promptAppendix: readonly string[]
): string =>
  promptAppendix.length > 0
    ? [
        prompt,
        "The following embedded references are part of the current turn. Treat them as already provided prompt content and do not search for alternative template files on disk.",
        ...promptAppendix,
      ].join("\n\n")
    : prompt;
