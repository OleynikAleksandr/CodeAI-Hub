import type {
  DevelopmentTreeDetectedNode,
  DevelopmentTreeDetectedNodeKind,
} from "./development-tree-node-detector";
import { DraftFrontmatterBuilder } from "./draft-frontmatter-builder";

export type DevelopmentTreeDraftFileName =
  | "ClusterDescription.draft.md"
  | "ClusterFacadeContract.draft.md"
  | "ModuleFacadeContract.draft.md"
  | "ModuleSpec.draft.md"
  | "PartDescription.draft.md";

export interface DevelopmentTreeDraftTemplate {
  readonly fileName: DevelopmentTreeDraftFileName;
  readonly nodeKind: DevelopmentTreeDetectedNodeKind;
}

export interface DevelopmentTreeRenderedDraft {
  readonly content: string;
  readonly fileName: DevelopmentTreeDraftFileName;
}

export interface DevelopmentTreeDraftRenderRequest {
  readonly derivedHash: string;
  readonly generatedAt: Date | string;
  readonly node: DevelopmentTreeDetectedNode;
}

const GENERATED_START = "<!-- generated -->";
const GENERATED_END = "<!-- /generated -->";
const AGENT_FILL_START = "<!-- agent-fill -->";
const AGENT_FILL_END = "<!-- /agent-fill -->";
const AGENT_FILL_SENTINEL =
  "_CODEAI_AGENT_FILL_SENTINEL: replace this line with draft content._";

const PRODUCT_PART_TEMPLATES: readonly DevelopmentTreeDraftTemplate[] = [
  { fileName: "PartDescription.draft.md", nodeKind: "product_part" },
] as const;

const CLUSTER_TEMPLATES: readonly DevelopmentTreeDraftTemplate[] = [
  { fileName: "ClusterDescription.draft.md", nodeKind: "cluster" },
  { fileName: "ClusterFacadeContract.draft.md", nodeKind: "cluster" },
] as const;

const MODULE_TEMPLATES: readonly DevelopmentTreeDraftTemplate[] = [
  { fileName: "ModuleSpec.draft.md", nodeKind: "module" },
  { fileName: "ModuleFacadeContract.draft.md", nodeKind: "module" },
] as const;

const TEMPLATE_MAP = {
  cluster: CLUSTER_TEMPLATES,
  module: MODULE_TEMPLATES,
  product_part: PRODUCT_PART_TEMPLATES,
} as const satisfies Record<
  DevelopmentTreeDetectedNodeKind,
  readonly DevelopmentTreeDraftTemplate[]
>;

const formatClusterReference = (node: DevelopmentTreeDetectedNode): string =>
  node.clusterId ?? "standalone";

const createAgentSection = (title: string): string =>
  [
    `## ${title}`,
    "",
    AGENT_FILL_START,
    AGENT_FILL_SENTINEL,
    AGENT_FILL_END,
  ].join("\n");

const createGeneratedBlock = (lines: readonly string[]): string =>
  [GENERATED_START, ...lines, GENERATED_END].join("\n");

const renderProductPartDescription = (
  node: DevelopmentTreeDetectedNode
): string =>
  [
    createGeneratedBlock([
      "## Identity",
      "- Node kind: Product Part",
      `- Part ID: ${node.partId}`,
      `- Source folder: ${node.relativePath}`,
      "",
      "## Purpose (derived)",
      "- Describe the product area represented by this part.",
      "",
      "## Owns (derived)",
      "- Child clusters and standalone modules materialized under this part.",
    ]),
    "",
    createAgentSection("Responsibility"),
    "",
    createAgentSection("Open questions"),
  ].join("\n");

const renderClusterDescription = (node: DevelopmentTreeDetectedNode): string =>
  [
    createGeneratedBlock([
      "## Identity",
      "- Node kind: Cluster",
      `- Part ID: ${node.partId}`,
      `- Cluster ID: ${node.id}`,
      `- Source folder: ${node.relativePath}`,
      "",
      "## Purpose (derived)",
      "- Describe the coordinated capability represented by this cluster.",
      "",
      "## Owns (derived)",
      "- Modules materialized under this cluster.",
    ]),
    "",
    createAgentSection("Responsibility"),
    "",
    createAgentSection("Internal coordination"),
    "",
    createAgentSection("Open questions"),
  ].join("\n");

const renderClusterFacadeContract = (
  node: DevelopmentTreeDetectedNode
): string =>
  [
    createGeneratedBlock([
      "## Identity",
      "- Node kind: Cluster Facade Contract",
      `- Part ID: ${node.partId}`,
      `- Cluster ID: ${node.id}`,
      `- Source folder: ${node.relativePath}`,
      "",
      "## Inputs from modules (derived list)",
      "- Populated from module drafts as they become ready.",
    ]),
    "",
    createAgentSection("Inputs from environment"),
    "",
    createAgentSection("Exposes to environment"),
    "",
    createAgentSection("Boundary invariants"),
    "",
    createAgentSection("Open questions"),
  ].join("\n");

const renderModuleSpec = (node: DevelopmentTreeDetectedNode): string =>
  [
    createGeneratedBlock([
      "## Identity",
      "- Node kind: Module",
      `- Part ID: ${node.partId}`,
      `- Cluster ID: ${formatClusterReference(node)}`,
      `- Module ID: ${node.id}`,
      `- Source folder: ${node.relativePath}`,
      "",
      "## Implements",
      "- ModuleFacadeContract.draft.md",
    ]),
    "",
    createAgentSection("Responsibility"),
    "",
    createAgentSection("Behavior"),
    "",
    createAgentSection("Internal invariants"),
    "",
    createAgentSection("Dependencies"),
    "",
    createAgentSection("Open questions"),
  ].join("\n");

const renderModuleFacadeContract = (
  node: DevelopmentTreeDetectedNode
): string =>
  [
    createGeneratedBlock([
      "## Identity",
      "- Node kind: Module Facade Contract",
      `- Part ID: ${node.partId}`,
      `- Owner cluster: ${formatClusterReference(node)}`,
      `- Module ID: ${node.id}`,
      `- Source folder: ${node.relativePath}`,
    ]),
    "",
    createAgentSection("Methods/Events exposed"),
    "",
    createAgentSection("Methods/Events consumed"),
    "",
    createAgentSection("Boundary invariants"),
    "",
    createAgentSection("Open questions"),
  ].join("\n");

const renderTemplateBody = (
  fileName: DevelopmentTreeDraftFileName,
  node: DevelopmentTreeDetectedNode
): string => {
  switch (fileName) {
    case "PartDescription.draft.md":
      return renderProductPartDescription(node);
    case "ClusterDescription.draft.md":
      return renderClusterDescription(node);
    case "ClusterFacadeContract.draft.md":
      return renderClusterFacadeContract(node);
    case "ModuleSpec.draft.md":
      return renderModuleSpec(node);
    case "ModuleFacadeContract.draft.md":
      return renderModuleFacadeContract(node);
    default: {
      const exhaustiveFileName: never = fileName;
      throw new Error(`Unsupported draft template: ${exhaustiveFileName}`);
    }
  }
};

export class DraftTemplateRegistry {
  private readonly frontmatterBuilder = new DraftFrontmatterBuilder();

  getTemplatesForNode(
    node: DevelopmentTreeDetectedNode
  ): readonly DevelopmentTreeDraftTemplate[] {
    return TEMPLATE_MAP[node.kind];
  }

  getFileNamesForNode(
    node: DevelopmentTreeDetectedNode
  ): readonly DevelopmentTreeDraftFileName[] {
    return this.getTemplatesForNode(node).map((template) => template.fileName);
  }

  renderDrafts(
    request: DevelopmentTreeDraftRenderRequest
  ): readonly DevelopmentTreeRenderedDraft[] {
    const frontmatter = this.frontmatterBuilder.build(request);
    return this.getTemplatesForNode(request.node).map((template) => ({
      fileName: template.fileName,
      content: `${frontmatter}\n# ${template.fileName.replace(".draft.md", "")}\n\n${renderTemplateBody(template.fileName, request.node)}\n`,
    }));
  }
}
