export interface ClusterContractSummaryRequest {
  readonly clusterId: string;
  readonly partId: string;
  readonly reviewCommitHash: string;
  readonly sessionId: string;
  readonly updatedAt: string;
}

export interface ClusterContractSummary {
  readonly clusterId: string;
  readonly nodeId: string;
  readonly partId: string;
  readonly reviewCommitHash: string;
  readonly reviewState: "merge_ready";
  readonly schema: "codeai-cluster-contract-review-result-v1";
  readonly sessionId: string;
  readonly summary: string;
  readonly updatedAt: string;
}

export const createClusterContractSummaryPath = (params: {
  readonly clusterId: string;
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/workflow/managed/development-tree-clusters/${params.partId}/${params.clusterId}.review-result.json`;

export class LeadProductPartCoordinationService {
  createClusterContractSummary(
    request: ClusterContractSummaryRequest
  ): ClusterContractSummary {
    return {
      clusterId: request.clusterId,
      nodeId: `cluster:${request.partId}/${request.clusterId}`,
      partId: request.partId,
      reviewCommitHash: request.reviewCommitHash,
      reviewState: "merge_ready",
      schema: "codeai-cluster-contract-review-result-v1",
      sessionId: request.sessionId,
      summary: `Cluster Contract ${request.clusterId} is merge-ready for Product Part ${request.partId}.`,
      updatedAt: request.updatedAt,
    };
  }
}
