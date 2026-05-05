import type { DevelopmentTreeDetectedNode } from "./development-tree-node-detector";
import { DraftTemplateRegistry } from "./draft-template-registry";
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
  ];
};

const createArtifactContextLines = (
  artifactContext: readonly NodePromptArtifactContextEntry[] | undefined
): string[] => {
  const sourceBoundary = [
    "Draft-pass source boundary:",
    "- For this automatic first draft pass, use only the scoped context included in this first prompt plus the listed target draft files.",
    "- You may inspect and edit the listed target draft files, but do not read, search, list, or open any other workspace files or documents.",
    "- If context seems incomplete or truncated, record the uncertainty as an Open question instead of reading another file.",
    "- Additional file reading is allowed only after the user explicitly asks or permits you to read files in a later message.",
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
    const content = [
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
    ].join("\n");
    return {
      content,
      draftFileNames,
      requiresTechnologyBaseAnswer: technology.requiresTechnologyBaseAnswer,
    };
  }
}
