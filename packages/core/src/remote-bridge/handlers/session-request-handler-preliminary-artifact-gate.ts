import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildManagedUserLedReviewHandoffMessage } from "../../managed-workflow-orchestration/managed-workflow-user-handoff-messages";

const DESCRIPTION_ARTIFACT_RELATIVE_PATH = "description/Final_Description.md";
const VIRTUAL_SIMULATION_ARTIFACT_RELATIVE_PATH =
  "virtual_simulation/virtual-simulation.md";
const FENCED_MARKDOWN_RE = /```(?:markdown|md)?\s*\n([\s\S]*?)\n```/iu;

type PreliminaryStage = "description" | "virtual_simulation";

export interface PreliminaryArtifactGateInput {
  readonly assistantMessages?: readonly PreliminaryAssistantMessage[];
  readonly stage: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

interface PreliminaryAssistantMessage {
  readonly content: string;
  readonly role: string;
}

export interface PreliminaryArtifactGateResult {
  readonly content: string;
  readonly tag: "managed-workflow-user-review" | "managed-workflow-validation";
}

const buildMissingDescriptionArtifactMessage = (
  workspaceSlug: string
): string =>
  [
    "Core cannot move Description to user review yet.",
    `The required artifact was not found: .codeai-hub/${workspaceSlug}/${DESCRIPTION_ARTIFACT_RELATIVE_PATH}`,
    "",
    "Ask the agent to write the canonical Final_Description.md artifact, or rerun Description before starting Virtual Simulation.",
  ].join("\n");

const buildMissingVirtualSimulationArtifactMessage = (
  workspaceSlug: string
): string =>
  [
    "Core cannot move Virtual Simulation to user review yet.",
    `The required artifact was not found: .codeai-hub/${workspaceSlug}/${VIRTUAL_SIMULATION_ARTIFACT_RELATIVE_PATH}`,
    "",
    "Ask the agent to write the canonical virtual-simulation.md artifact, or rerun Virtual Simulation before starting Diagram Modules.",
  ].join("\n");

const isPreliminaryStage = (stage: string): stage is PreliminaryStage =>
  stage === "description" || stage === "virtual_simulation";

const resolveStageArtifactRelativePath = (stage: PreliminaryStage): string =>
  stage === "description"
    ? DESCRIPTION_ARTIFACT_RELATIVE_PATH
    : VIRTUAL_SIMULATION_ARTIFACT_RELATIVE_PATH;

const artifactExists = async (options: {
  readonly relativePath: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<boolean> => {
  const artifactPath = path.join(
    options.workspaceRoot,
    ".codeai-hub",
    options.workspaceSlug,
    options.relativePath
  );
  try {
    await access(artifactPath);
    return true;
  } catch {
    return false;
  }
};

const extractFencedArtifact = (content: string): string | null => {
  const match = content.match(FENCED_MARKDOWN_RE);
  const value = match?.[1]?.trim();
  return value && value.length > 0 ? `${value}\n` : null;
};

const maybeMaterializeArtifactFromAssistant = async (
  input: PreliminaryArtifactGateInput & { readonly stage: PreliminaryStage }
): Promise<void> => {
  const relativePath = resolveStageArtifactRelativePath(input.stage);
  const targetPath = `.codeai-hub/${input.workspaceSlug}/${relativePath}`;
  const assistantMessages = (input.assistantMessages ?? []).filter(
    (message) => message.role === "assistant"
  );
  const candidate = assistantMessages
    .reverse()
    .find(
      (message) =>
        message.content.includes(targetPath) ||
        message.content.includes(path.basename(relativePath))
    );
  if (!candidate) {
    return;
  }
  const artifact = extractFencedArtifact(candidate.content);
  if (!artifact) {
    return;
  }
  const absolutePath = path.join(input.workspaceRoot, targetPath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, artifact, "utf8");
};

const buildMissingArtifactMessage = (
  stage: PreliminaryStage,
  workspaceSlug: string
): string =>
  stage === "description"
    ? buildMissingDescriptionArtifactMessage(workspaceSlug)
    : buildMissingVirtualSimulationArtifactMessage(workspaceSlug);

export const resolvePreliminaryArtifactGate = async (
  input: PreliminaryArtifactGateInput
): Promise<PreliminaryArtifactGateResult | null> => {
  if (!isPreliminaryStage(input.stage)) {
    return null;
  }
  await maybeMaterializeArtifactFromAssistant({
    ...input,
    stage: input.stage,
  });
  if (
    !(await artifactExists({
      relativePath: resolveStageArtifactRelativePath(input.stage),
      workspaceRoot: input.workspaceRoot,
      workspaceSlug: input.workspaceSlug,
    }))
  ) {
    return {
      content: buildMissingArtifactMessage(input.stage, input.workspaceSlug),
      tag: "managed-workflow-validation",
    };
  }
  return {
    content: buildManagedUserLedReviewHandoffMessage(
      input.stage === "description" ? "Description" : "Virtual Simulation"
    ),
    tag: "managed-workflow-user-review",
  };
};
