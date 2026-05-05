import type { DevelopmentTreeDetectedNode } from "./development-tree-node-detector";
import { DraftTemplateRegistry } from "./draft-template-registry";

export interface NodeFirstMessageBuildRequest {
  readonly artifactContext?: readonly NodePromptArtifactContextEntry[];
  readonly node: DevelopmentTreeDetectedNode;
  readonly responseLanguage?: string;
  readonly technologyBase?: string;
}

export interface NodePromptArtifactContextEntry {
  readonly content: string;
  readonly label: string;
  readonly relativePath: string;
  readonly truncated: boolean;
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

const createArtifactContextLines = (
  artifactContext: readonly NodePromptArtifactContextEntry[] | undefined
): string[] => {
  if (!artifactContext?.length) {
    return [
      "Existing workflow artifacts:",
      "- No upstream workflow artifacts were found on disk. Ask the user only for missing decisions that are not derivable from the node drafts.",
    ];
  }
  return [
    "Existing workflow artifacts (read before asking the user):",
    "- Treat these artifacts as prior context. Do not ask the user to re-explain information already present here.",
    "- If an excerpt is truncated, read the referenced file before making decisions.",
    ...artifactContext.flatMap((artifact) => [
      "",
      `### ${artifact.label}`,
      `- Path: ${artifact.relativePath}`,
      artifact.truncated
        ? "- Content excerpt: truncated; read the file for the full artifact."
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
