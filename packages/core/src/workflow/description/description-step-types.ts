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

export type DescriptionStepSnapshot = {
  readonly workspaceSlug: string;
  readonly workspacePath: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly questionnairePath?: string;
  readonly draftPath?: string;
  readonly finalPath?: string;
  /**
   * Canonical single-session slot for the single-agent description flow.
   */
  readonly primarySession?: DescriptionSessionRef;
};

export type DescriptionBranchSnapshot = {
  readonly updatedAt: string;
  readonly questionnairePath?: string;
  readonly draftPath?: string;
  readonly finalPath?: string;
  readonly primarySession?: DescriptionSessionRef;
  /**
   * Temporary compat alias for PM consumers that still read `description.session`.
   * Remove once workflow-state client stops emitting/reading the legacy slot.
   */
  readonly session?: DescriptionSessionRef;
  readonly sessionKind?: "collector";
};

export type DescriptionStepUpdate = {
  readonly questionnairePath?: string | null;
  readonly draftPath?: string | null;
  readonly finalPath?: string | null;
  readonly primarySession?: DescriptionSessionRef | null;
};
