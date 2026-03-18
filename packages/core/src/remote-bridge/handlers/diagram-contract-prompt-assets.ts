import path from "node:path";

const AGENT_ROOT_PATH = path.resolve(__dirname, "../../../../agents");

export const resolveDiagramAgentAssetPath = (
  agentName: string,
  assetFileName: string
): string => path.join(AGENT_ROOT_PATH, agentName, "assets", assetFileName);

export const DIAGRAM_MODULES_PROMPT_APPENDIX_PATHS = [
  resolveDiagramAgentAssetPath(
    "diagram-modules-agent",
    "module-map-field-reference.md"
  ),
  resolveDiagramAgentAssetPath(
    "diagram-modules-agent",
    "module-map-merge-rules.md"
  ),
] as const;

export const DIAGRAM_FACADES_PROMPT_APPENDIX_PATHS = [
  resolveDiagramAgentAssetPath(
    "diagram-facades-agent",
    "facade-map-field-reference.md"
  ),
  resolveDiagramAgentAssetPath(
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
