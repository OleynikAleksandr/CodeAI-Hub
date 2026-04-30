import type { SessionModelBinding } from "../../session-model-binding";
import type {
  CodexModelSwitchReasoningEffort,
  SessionModelUpdatePayload,
} from "../session-stream-contracts";

export interface SessionModelSwitchTarget {
  readonly providerId: string;
  readonly targetModelId: string;
  readonly targetReasoningEffort?: CodexModelSwitchReasoningEffort;
  readonly targetThinkingLevel?: string;
  readonly thinkingEnabled?: boolean;
}

export interface SessionModelSwitchContext {
  readonly previousBinding?: SessionModelBinding | null;
  readonly sessionId: string;
  readonly workspacePath: string;
}

export interface SessionModelSwitchInjectionPayload {
  readonly baseInstructions?: string;
  readonly previousModelId?: string;
  readonly targetModelId: string;
  readonly targetReasoningEffort?: CodexModelSwitchReasoningEffort;
}

export interface SessionModelSwitchResult {
  readonly broadcastPayload: SessionModelUpdatePayload;
  readonly modelBinding: SessionModelBinding;
  readonly pendingInjection?: SessionModelSwitchInjectionPayload;
}

export type SessionModelSwitchValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

export interface ProviderModelSwitchStrategy {
  buildModelBinding(
    target: SessionModelSwitchTarget,
    context: SessionModelSwitchContext
  ): SessionModelBinding;
  buildSwitchInjection?(
    target: SessionModelSwitchTarget,
    context: SessionModelSwitchContext
  ): SessionModelSwitchInjectionPayload | null;
  readonly providerId: string;
  validateTarget(
    target: SessionModelSwitchTarget
  ): SessionModelSwitchValidationResult;
}
