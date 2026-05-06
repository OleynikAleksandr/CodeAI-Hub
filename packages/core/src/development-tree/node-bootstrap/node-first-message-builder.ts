import type { DevelopmentTreeDetectedNode } from "./development-tree-node-detector";
import { DraftTemplateRegistry } from "./draft-template-registry";
import { createLocalizedNodePromptInstructionLines } from "./localized-node-prompt-instructions";
import type { NodePromptContextEntry } from "./node-prompt-context-extractor";

export type NodePromptArtifactContextEntry = NodePromptContextEntry;

export interface NodeFirstMessageBuildRequest {
  readonly artifactContext?: readonly NodePromptArtifactContextEntry[];
  readonly artifactLanguage?: string;
  readonly node: DevelopmentTreeDetectedNode;
  readonly responseLanguage?: string;
  readonly technologyBase?: string;
}

export interface NodeFirstMessageBuildResult {
  readonly content: string;
  readonly draftFileNames: readonly string[];
  readonly requiresTechnologyBaseAnswer: boolean;
}

const NODE_KIND_LABELS = {
  cluster: "Cluster",
  module: "Module",
  product_part: "Product Part",
} as const;

const formatClusterLine = (node: DevelopmentTreeDetectedNode): string =>
  node.clusterId
    ? `- Cluster ID: ${node.clusterId}`
    : "- Cluster ID: standalone";

const createTechnologyInstruction = (
  technologyBase: string | undefined
): {
  readonly line: string;
  readonly requiresTechnologyBaseAnswer: boolean;
} => {
  if (technologyBase?.trim()) {
    return {
      line: `- Technology base: ${technologyBase.trim()}`,
      requiresTechnologyBaseAnswer: false,
    };
  }
  return {
    line: "- Technology base: unknown. Ask the user to confirm the stack before making framework-specific decisions.",
    requiresTechnologyBaseAnswer: true,
  };
};

const createResponseLanguageInstruction = (
  responseLanguage?: string
): string => {
  const language = responseLanguage?.trim() || "en";
  return `- User communication language: ${language} (from Settings > General > Reasoning). Translate and communicate with the user in this language.`;
};

const createArtifactLanguageLines = (
  artifactLanguage: string | undefined
): string[] => {
  const language = artifactLanguage?.trim() || "en";
  return [
    "Artifacts for the User language (runtime directive):",
    `- Target language code: ${language} (from Settings > General > Artifacts for the User).`,
    `- Write descriptive prose inside the draft artifacts in ${language}.`,
    "- Keep YAML frontmatter, generated blocks, HTML comments, file names, ids, DSL/contract markers, field names, status tokens, and structural section headings in canonical English form.",
    "- Localize only descriptive prose inside <!-- agent-fill --> blocks, assumptions, open questions, and brief user-facing artifact notes.",
    "- Contract artifacts are not an English-language exception: in ModuleFacadeContract.draft.md and ClusterFacadeContract.draft.md, explanatory prose inside <!-- agent-fill --> blocks must still use the target artifact language.",
    "- In facade contract drafts, keep method/event names and identifiers canonical, but write descriptions, boundary rationale, assumptions, and open questions in the target artifact language.",
  ];
};

const createRuntimeToolingFactsLines = (): string[] => [
  "Runtime tooling facts:",
  "- CodeAI Hub starts shell tools in the node workspace context for this session when shell tools are available.",
  "- Python command: `python3`.",
  "- Node command: `node`.",
  "- Package manager command: `npm`.",
  "- Do not spend a turn probing these routine commands or announcing fallback messages such as `python is missing`; mention tooling only when a command actually fails and blocks the draft update.",
];

const createArtifactWriteEncodingLines = (): string[] => [
  "Artifact write encoding:",
  "- Write Markdown draft artifacts as UTF-8 text and preserve normal LF line endings.",
  "- Cyrillic and other localized prose must be written directly as valid UTF-8, not escaped or transliterated.",
  "- Use the provider-native edit/write path when it preserves UTF-8; if a write path corrupts localized text, retry with a UTF-8-safe shell heredoc or equivalent exact-write method.",
  "- Do not send user-facing progress updates about routine encoding retries; mention encoding only if it remains a blocking draft-write failure.",
];

const createArtifactEditOperationLines = (): string[] => [
  "Artifact edit operation:",
  "- For Markdown draft artifacts, prefer the provider-native patch/edit operation against the target context; for Codex, use `apply_patch` when available.",
  "- Do not choose fallback scripts as the first approach for ordinary Markdown draft edits.",
  "- For `<!-- agent-fill -->` blocks, replace only the intended block body and preserve frontmatter, generated blocks, sentinels, and LF line endings.",
  "- When the block contains `_CODEAI_AGENT_FILL_SENTINEL: replace this line with draft content._`, replace that sentinel line through the patch/edit operation.",
  "- If patch context needs adjustment because of blank lines or sentinel differences, retry silently with exact local context.",
  "- Do not send user-facing progress updates about patch mismatch, invisible blank lines, line-by-line checks, or fallback script rewrites unless the edit is blocked.",
];

const createArtifactContextLines = (
  artifactContext: readonly NodePromptArtifactContextEntry[] | undefined
): string[] => {
  const sourceBoundary = [
    "Draft-pass source boundary:",
    "- For this automatic first draft pass, use only the scoped context included in this first prompt plus the listed target draft files.",
    "- You may inspect and edit the listed target draft files, but do not read, search, list, or open any other workspace files or documents.",
    "- If context seems incomplete or truncated, record the uncertainty as an Open question instead of reading another file.",
    "- Additional file reading is allowed only after the user explicitly asks or permits you to read files in a later message.",
    "- When included, Application Skeleton Map and Quality Gates Contract entries are binding for production paths and verification commands.",
  ];
  if (!artifactContext?.length) {
    return [
      "Scoped workflow context:",
      "- No upstream workflow artifacts were found on disk. Ask the user only for missing decisions that are not derivable from the node drafts.",
      "",
      ...sourceBoundary,
    ];
  }
  return [
    "Scoped workflow context (read before asking the user):",
    "- Treat these deterministic excerpts as prior context for this exact Product Part / Cluster / Module node.",
    "- Do not ask the user to re-explain information already present here.",
    "- If an excerpt is truncated, use the excerpt as-is and capture any missing detail as an Open question.",
    "",
    ...sourceBoundary,
    ...artifactContext.flatMap((artifact) => [
      "",
      `### ${artifact.label}`,
      `- Path: ${artifact.relativePath}`,
      artifact.truncated
        ? "- Content excerpt: truncated; do not read the file during this automatic draft pass."
        : "- Content:",
      "```markdown",
      artifact.content,
      "```",
    ]),
  ];
};

const createNodeSpecificRules = (
  node: DevelopmentTreeDetectedNode
): string[] => {
  if (node.kind === "module") {
    return [
      "- Keep implementation details in ModuleSpec.draft.md.",
      "- Keep public methods/events and consumed events in ModuleFacadeContract.draft.md.",
      "- Do not add Inputs/Outputs sections to ModuleSpec.draft.md.",
    ];
  }
  if (node.kind === "cluster") {
    return [
      "- Define cluster coordination and responsibility in ClusterDescription.draft.md.",
      "- Define the cluster public boundary in ClusterFacadeContract.draft.md.",
    ];
  }
  return [
    "- Define product-part responsibility in PartDescription.draft.md.",
    "- Keep child cluster/module ownership aligned with the materialized tree.",
  ];
};

export class NodeFirstMessageBuilder {
  private readonly templateRegistry = new DraftTemplateRegistry();

  build(request: NodeFirstMessageBuildRequest): NodeFirstMessageBuildResult {
    const draftFileNames = this.templateRegistry.getFileNamesForNode(
      request.node
    );
    const technology = createTechnologyInstruction(request.technologyBase);
    const localizedInstructionLines = createLocalizedNodePromptInstructionLines(
      {
        artifactLanguage: request.artifactLanguage,
        draftFileNames,
        node: request.node,
        responseLanguage: request.responseLanguage,
      }
    );
    const content = [
      ...localizedInstructionLines,
      localizedInstructionLines.length > 0 ? "" : null,
      `You are responsible for the ${NODE_KIND_LABELS[request.node.kind]} node "${request.node.id}".`,
      "",
      "Node context:",
      `- Part ID: ${request.node.partId}`,
      formatClusterLine(request.node),
      `- Folder: ${request.node.relativePath}`,
      technology.line,
      createResponseLanguageInstruction(request.responseLanguage),
      "",
      ...createArtifactLanguageLines(request.artifactLanguage),
      "",
      ...createRuntimeToolingFactsLines(),
      "",
      ...createArtifactWriteEncodingLines(),
      "",
      ...createArtifactEditOperationLines(),
      "",
      ...createArtifactContextLines(request.artifactContext),
      "",
      "Draft files to fill:",
      ...draftFileNames.map((fileName) => `- ${fileName}`),
      "",
      "Editing rules:",
      "- Do not edit YAML frontmatter.",
      "- Do not edit content inside <!-- generated --> blocks.",
      "- Write only inside <!-- agent-fill --> blocks.",
      "- Leave unresolved assumptions as explicit Open questions.",
      "",
      "Node-specific work:",
      ...createNodeSpecificRules(request.node),
    ]
      .filter((entry): entry is string => entry !== null)
      .join("\n");
    return {
      content,
      draftFileNames,
      requiresTechnologyBaseAnswer: technology.requiresTechnologyBaseAnswer,
    };
  }
}
