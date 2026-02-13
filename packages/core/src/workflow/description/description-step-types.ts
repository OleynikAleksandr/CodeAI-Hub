export type DescriptionSessionRef = {
  readonly providerId: string;
  readonly providerSessionId: string;
  readonly jsonlPath: string;
  /**
   * Stable "logical dialog" id used for unified UI history JSONL.
   * Unlike providerSessionId, this must not change across rollover/resume.
   */
  readonly dialogSessionId?: string;
};

export type DescriptionSessionKind = "collector" | "reviewer";

export type DescriptionStepSnapshot = {
  readonly workspaceSlug: string;
  readonly workspacePath: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly questionnairePath?: string;
  readonly draftPath?: string;
  readonly finalPath?: string;
  /**
   * Per-agent session refs for stage=description.
   * This is the source of truth for "1 agent = 1 dialog JSONL" persistence.
   */
  readonly collectorSession?: DescriptionSessionRef;
  readonly reviewerSession?: DescriptionSessionRef;
  readonly session?: DescriptionSessionRef;
  readonly sessionKind?: DescriptionSessionKind;
};

export type DescriptionBranchSnapshot = {
  readonly updatedAt: string;
  readonly questionnairePath?: string;
  readonly draftPath?: string;
  readonly finalPath?: string;
  readonly session?: DescriptionSessionRef;
  readonly sessionKind?: DescriptionSessionKind;
};

export type DescriptionStepUpdate = {
  readonly questionnairePath?: string | null;
  readonly draftPath?: string | null;
  readonly finalPath?: string | null;
  readonly collectorSession?: DescriptionSessionRef | null;
  readonly reviewerSession?: DescriptionSessionRef | null;
  readonly session?: DescriptionSessionRef | null;
  readonly sessionKind?: DescriptionSessionKind | null;
};
