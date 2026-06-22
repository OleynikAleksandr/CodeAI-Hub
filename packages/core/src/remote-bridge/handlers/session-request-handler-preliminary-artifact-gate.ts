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

// Live streaming splits the assistant answer into many `tag: "live"` chunks and
// the live-tail dedupe drops the whole final assistant message, so no single
// message still carries the artifact path plus fenced block. Reconstruct the
// latest answer by joining the trailing run of assistant messages, then keep the
// per-message contents as a fallback for the non-streamed (cloud) path.
const buildArtifactCandidateContents = (
  messages: readonly PreliminaryAssistantMessage[]
): string[] => {
  const trailing: string[] = [];
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== "assistant") {
      break;
    }
    trailing.push(message.content);
  }
  const reconstructed = trailing.reverse().join("");
  const perMessage = messages
    .filter((message) => message.role === "assistant")
    .map((message) => message.content)
    .reverse();
  return reconstructed.length > 0 ? [reconstructed, ...perMessage] : perMessage;
};

// When reasoning is split into a separate `thinking` message, the model leaves
// the fenced artifact block in the `assistant` message but the artifact filename
// reference in the `thinking` message, so no single assistant message carries
// both. Confirm the filename across the latest assistant+thinking turn, then
// still extract the fenced block from an assistant candidate.
const collectLatestTurnText = (
  messages: readonly PreliminaryAssistantMessage[]
): string => {
  const parts: string[] = [];
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const role = messages[index]?.role;
    if (role !== "assistant" && role !== "thinking") {
      break;
    }
    parts.push(messages[index].content);
  }
  return parts.reverse().join("\n");
};

const maybeMaterializeArtifactFromAssistant = async (
  input: PreliminaryArtifactGateInput & { readonly stage: PreliminaryStage }
): Promise<void> => {
  const relativePath = resolveStageArtifactRelativePath(input.stage);
  const targetPath = `.codeai-hub/${input.workspaceSlug}/${relativePath}`;
  const artifactBasename = path.basename(relativePath);
  const messages = input.assistantMessages ?? [];
  const latestTurnText = collectLatestTurnText(messages);
  const filenameInTurn =
    latestTurnText.includes(targetPath) ||
    latestTurnText.includes(artifactBasename);
  const candidate = buildArtifactCandidateContents(messages).find(
    (content) =>
      (filenameInTurn ||
        content.includes(targetPath) ||
        content.includes(artifactBasename)) &&
      extractFencedArtifact(content) !== null
  );
  if (!candidate) {
    return;
  }
  const artifact = extractFencedArtifact(candidate);
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
