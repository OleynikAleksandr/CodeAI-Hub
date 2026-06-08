export interface ClusterContractPromptBuilderRequest {
  readonly applicationSkeletonMap?: string | null;
  readonly clusterId: string;
  readonly orderPlanJson: string;
  readonly orderPlanMarkdown: string;
  readonly partId: string;
  readonly productPartBrief: string;
  readonly qualityGatesContract?: string | null;
  readonly workspaceSlug: string;
}

const createArtifactPath = (params: {
  readonly clusterId: string;
  readonly fileName: string;
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/development_tree/materialized/product-parts/${params.partId}/clusters/${params.clusterId}/${params.fileName}`;

const fenced = (label: string, content: string | null | undefined): string =>
  [`### ${label}`, "", "```", content?.trim() || "Not available.", "```"].join(
    "\n"
  );

export class ClusterContractPromptBuilder {
  buildPrompt(request: ClusterContractPromptBuilderRequest): string {
    const targets = [
      "ClusterSpecification.draft.md",
      "ClusterSpecification.draft.json",
      "ClusterFacadeContract.draft.md",
      "ClusterFacadeContract.draft.json",
    ].map((fileName) =>
      createArtifactPath({
        clusterId: request.clusterId,
        fileName,
        partId: request.partId,
        workspaceSlug: request.workspaceSlug,
      })
    );
    return [
      `Core managed assignment: create the cluster contract for Product Part \`${request.partId}\`, Cluster \`${request.clusterId}\`.`,
      "",
      "You are a scoped cluster-contract sub-agent. Do not implement code and do not open module agents. Produce the cluster-level specification and facade contract that downstream module agents will use.",
      "",
      "Required output artifacts:",
      ...targets.map((target) => `- \`${target}\``),
      "",
      "The JSON artifacts must be valid JSON and mirror the markdown decisions: public facade inputs, outputs, events/errors, owned modules, dependencies, open questions, and validation gates.",
      "",
      "Use the following inline context as authoritative input. Do not rely on path references as hidden instructions.",
      "",
      fenced(
        "Accepted Product Part Development Brief",
        request.productPartBrief
      ),
      "",
      fenced(
        "Accepted Development Order Plan Markdown",
        request.orderPlanMarkdown
      ),
      "",
      fenced("Accepted Development Order Plan JSON", request.orderPlanJson),
      "",
      fenced("Application Skeleton Map", request.applicationSkeletonMap),
      "",
      fenced("Quality Gates Contract", request.qualityGatesContract),
      "",
      "Expected commit message after the artifacts are ready: `docs: draft cluster contract`.",
    ].join("\n");
  }
}
