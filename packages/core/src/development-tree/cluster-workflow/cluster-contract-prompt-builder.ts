import type { DevelopmentOrderContractSeed } from "../product-part-workflow/development-order-plan-unlock-state";

export interface ClusterContractPromptBuilderRequest {
  readonly applicationSkeletonMap?: string | null;
  readonly clusterId: string;
  readonly contractSeed?: DevelopmentOrderContractSeed | null;
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

const fencedJson = (label: string, content: unknown): string =>
  fenced(label, content ? JSON.stringify(content, null, 2) : null);

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
      "The Product Part contract seed below is the parent-owned boundary. You may refine names, DTO shape, edge cases, and algorithms, but you must not silently change the consumer, required inputs, required outputs, statuses/errors, or owned-module responsibility.",
      "If the seed is insufficient or contradictory, stop with a blocking question or revision request instead of inventing a different boundary.",
      "",
      "The Cluster Facade Contract is a pre-code artifact, not an architecture essay. It must define the future facade class name, facade file path, public method signatures, input DTOs, output DTOs, discriminated result union, status/error model, owned module call order, and boundary contract for each owned module.",
      "",
      "The JSON artifacts must be valid JSON and mirror the markdown decisions: concrete facade class/file/methods/types, public facade inputs, outputs, events/errors, owned modules, module boundary contracts, dependencies, blocking/non-blocking open questions, and validation gates.",
      "",
      "Use the following inline context as authoritative input. Do not rely on path references as hidden instructions.",
      "",
      fencedJson("Product Part Contract Seed", request.contractSeed),
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
