const DESCRIPTION_STAGE = "description";
const VIRTUAL_SIMULATION_STAGE = "virtual_simulation";

export type PreliminaryReviewStage =
  | typeof DESCRIPTION_STAGE
  | typeof VIRTUAL_SIMULATION_STAGE;

export interface PreliminaryReviewSession {
  readonly messages?: readonly {
    readonly content?: string;
    readonly role?: string;
    readonly tag?: string;
  }[];
}

export const isPreliminaryReviewStage = (
  stage: string
): stage is PreliminaryReviewStage =>
  stage === DESCRIPTION_STAGE || stage === VIRTUAL_SIMULATION_STAGE;

export const buildPreliminaryReviewHandoffMessage = async (_params: {
  readonly session: PreliminaryReviewSession;
  readonly stage: PreliminaryReviewStage;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<null> => null;
