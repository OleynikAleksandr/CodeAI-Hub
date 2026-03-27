export interface DescriptionSessionRef {
  /**
   * Stable "logical dialog" id used for unified UI history JSONL.
   * Unlike providerSessionId, this must not change across rollover/resume.
   */
  readonly dialogSessionId?: string;
  readonly jsonlPath: string;
  readonly providerId: string;
  readonly providerSessionId: string;
}

export interface DescriptionStepSnapshot {
  readonly createdAt: string;
  readonly draftPath?: string;
  readonly finalPath?: string;
  /**
   * Canonical single-session slot for the single-agent description flow.
   */
  readonly primarySession?: DescriptionSessionRef;
  readonly questionnairePath?: string;
  readonly updatedAt: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}

export interface DescriptionBranchSnapshot {
  readonly draftPath?: string;
  readonly finalPath?: string;
  readonly primarySession?: DescriptionSessionRef;
  readonly questionnairePath?: string;
  readonly updatedAt: string;
}

export interface DescriptionStepUpdate {
  readonly draftPath?: string | null;
  readonly finalPath?: string | null;
  readonly primarySession?: DescriptionSessionRef | null;
  readonly questionnairePath?: string | null;
}
