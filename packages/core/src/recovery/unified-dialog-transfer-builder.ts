/**
 * Unified Dialog Transfer Builder — builds the provider-switch-handoff.md
 * document for cross-provider takeover.
 */

import type { CanonicalSessionPreamble } from "./canonical-session-preamble-resolver";

export type SwitchHandoffContext = {
  readonly initiator: "core_recovery" | "user_request";
  readonly previousProviderId: string;
  readonly previousModelId: string | null;
  readonly targetProviderId: string;
  readonly targetModelId: string | null;
  readonly switchMode: "retry_in_place" | "switch_model" | "switch_provider";
  readonly reason: string;
  readonly preamble: CanonicalSessionPreamble;
  readonly latestUserIntent: string | null;
  readonly dialogPromptPath: string;
};

export function buildProviderSwitchHandoff(
  context: SwitchHandoffContext
): string {
  const artifacts = context.preamble.canonicalArtifacts
    .map((a, i) => `${i + 1}. \`${a.path}\`: ${a.reason}`)
    .join("\n");

  const intentSection = context.latestUserIntent
    ? `- Raw user message: "${context.latestUserIntent}"\n- If the raw message is "Продолжай", continue from the exact interruption point.`
    : "- No unresolved user message.";

  return `# Provider Switch Handoff

## Switch Context
- Initiator: ${context.initiator}
- Previous provider: ${context.previousProviderId}
- Previous model: ${context.previousModelId ?? "unknown"}
- Target provider: ${context.targetProviderId}
- Target model: ${context.targetModelId ?? "settings-default"}
- Switch mode: ${context.switchMode}
- Reason: ${context.reason}

## Canonical Session Preamble
- Stage: ${context.preamble.stage ?? "unknown"}
- Language: ${context.preamble.language}
- ${context.preamble.continuationInstructions}

## Current Objective
- ${context.preamble.currentObjective}

## Canonical Artifacts To Read
${artifacts || "- No stage-specific artifacts."}

## Latest Unresolved User Intent
${intentSection}

## Provider-Facing Dialog
- \`${context.dialogPromptPath}\`

## Rules
- Do not mention provider switch unless the user asks.
- Treat the provider-facing dialog as the canonical conversational transcript.
- Continue in Russian.
`;
}

export function buildBootstrapPrompt(
  handoffPath: string,
  dialogPromptPath: string,
  artifactPaths: readonly string[]
): string {
  const artifactLines = artifactPaths
    .map((p, i) => `${i + 3}. \`${p}\``)
    .join("\n");

  return `# Core Continuation Bootstrap

You are taking over an existing CodeAI Hub dialog.

Read these inputs in order before replying:
1. \`${handoffPath}\`
2. \`${dialogPromptPath}\`
${artifactLines}

Hard rules:
- Do not mention provider switching unless the user asks directly.
- Do not restate the full history.
- Continue from the latest unresolved user intent.
- Follow canonical artifacts over older assistant assumptions if they conflict.
- Reply in Russian.
`;
}
