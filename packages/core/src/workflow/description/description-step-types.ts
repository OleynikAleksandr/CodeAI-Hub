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

export type DescriptionSessionKind = "collector";

export type DescriptionStepSnapshot = {
  readonly workspaceSlug: string;
  readonly workspacePath: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly questionnairePath?: string;
  readonly draftPath?: string;
  readonly finalPath?: string;
  /**
   * Canonical single-session slot for the new single-agent description flow.
   * Legacy collector slot remains for backward compatibility.
   */
  readonly primarySession?: DescriptionSessionRef;
  /**
   * Session ref for stage=description.
   * This is the source of truth for "1 agent = 1 dialog JSONL" persistence.
   */
  readonly collectorSession?: DescriptionSessionRef;
  readonly session?: DescriptionSessionRef;
  readonly sessionKind?: DescriptionSessionKind;
};

export type DescriptionBranchSnapshot = {
  readonly updatedAt: string;
  readonly questionnairePath?: string;
  readonly draftPath?: string;
  readonly finalPath?: string;
  readonly primarySession?: DescriptionSessionRef;
  /**
   * Session ref for stage=description.
   * These are used by clients to restore dialog history after restart.
   */
  readonly collectorSession?: DescriptionSessionRef;
  /**
   * Legacy single-slot ref (kept for backward compatibility while migrating).
   */
  readonly session?: DescriptionSessionRef;
  readonly sessionKind?: DescriptionSessionKind;
};

export type DescriptionStepUpdate = {
  readonly questionnairePath?: string | null;
  readonly draftPath?: string | null;
  readonly finalPath?: string | null;
  readonly primarySession?: DescriptionSessionRef | null;
  readonly collectorSession?: DescriptionSessionRef | null;
  readonly session?: DescriptionSessionRef | null;
  readonly sessionKind?: DescriptionSessionKind | null;
};
