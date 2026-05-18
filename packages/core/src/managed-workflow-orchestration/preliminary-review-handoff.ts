import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildManagedUserLedReviewHandoffMessage } from "./managed-workflow-user-handoff-messages";

const DESCRIPTION_STAGE = "description";
const VIRTUAL_SIMULATION_STAGE = "virtual_simulation";
const VIRTUAL_SIMULATION_TITLE_RE = /^#\s+Virtual Simulation:/m;
const VIRTUAL_SIMULATION_SCENARIO_RE =
  /^(?:#{1,6}\s+)?(?:Сценарий|Scenario)\s+\d+\b/gm;

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

const PRELIMINARY_REVIEW_STAGES: Record<
  PreliminaryReviewStage,
  {
    readonly artifactPath: (workspaceSlug: string) => string;
    readonly label: "Description" | "Virtual Simulation";
  }
> = {
  description: {
    artifactPath: (workspaceSlug) =>
      `.codeai-hub/${workspaceSlug}/description/Final_Description.md`,
    label: "Description",
  },
  virtual_simulation: {
    artifactPath: (workspaceSlug) =>
      `.codeai-hub/${workspaceSlug}/virtual_simulation/virtual-simulation.md`,
    label: "Virtual Simulation",
  },
};

export const isPreliminaryReviewStage = (
  stage: string
): stage is PreliminaryReviewStage =>
  stage === DESCRIPTION_STAGE || stage === VIRTUAL_SIMULATION_STAGE;

const resolvePreliminaryReviewStageLabel = (
  stage: PreliminaryReviewStage
): "Description" | "Virtual Simulation" =>
  PRELIMINARY_REVIEW_STAGES[stage].label;

const hasExistingPreliminaryReviewHandoff = (
  session: PreliminaryReviewSession,
  label: string
): boolean =>
  session.messages?.some(
    (message) =>
      message.role === "system" &&
      (message.tag === "managed-workflow-user-review" ||
        message.tag === "managed-workflow-complete") &&
      typeof message.content === "string" &&
      message.content.includes(`Core: ${label} `)
  ) ?? false;

const isPreliminaryArtifactReady = async (params: {
  readonly stage: PreliminaryReviewStage;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<boolean> => {
  const content = await readFile(
    path.join(
      params.workspaceRoot,
      PRELIMINARY_REVIEW_STAGES[params.stage].artifactPath(params.workspaceSlug)
    ),
    "utf8"
  ).catch(() => "");
  if (content.trim().length === 0) {
    return false;
  }
  if (params.stage === VIRTUAL_SIMULATION_STAGE) {
    return (
      VIRTUAL_SIMULATION_TITLE_RE.test(content) &&
      (content.match(VIRTUAL_SIMULATION_SCENARIO_RE)?.length ?? 0) > 0
    );
  }
  return true;
};

export const buildPreliminaryReviewHandoffMessage = async (params: {
  readonly session: PreliminaryReviewSession;
  readonly stage: PreliminaryReviewStage;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<string | null> => {
  const label = resolvePreliminaryReviewStageLabel(params.stage);
  if (hasExistingPreliminaryReviewHandoff(params.session, label)) {
    return null;
  }
  if (
    !(await isPreliminaryArtifactReady({
      stage: params.stage,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    }))
  ) {
    return null;
  }
  return buildManagedUserLedReviewHandoffMessage(label);
};
