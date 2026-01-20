export type DescriptionSessionRef = {
  readonly providerId: string;
  readonly providerSessionId: string;
  readonly jsonlPath: string;
};

export type DescriptionStepSnapshot = {
  readonly workspaceSlug: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly questionnairePath?: string;
  readonly draftPath?: string;
  readonly finalPath?: string;
  readonly session?: DescriptionSessionRef;
};

export type DescriptionBranchSnapshot = {
  readonly updatedAt: string;
  readonly questionnairePath?: string;
  readonly draftPath?: string;
  readonly finalPath?: string;
  readonly session?: DescriptionSessionRef;
};

export type DescriptionStepUpdate = {
  readonly questionnairePath?: string | null;
  readonly draftPath?: string | null;
  readonly finalPath?: string | null;
  readonly session?: DescriptionSessionRef | null;
};
