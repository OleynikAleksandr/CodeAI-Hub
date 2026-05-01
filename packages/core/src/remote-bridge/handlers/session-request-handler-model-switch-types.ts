import type { SessionModelBinding } from "../../session-model-binding";
import type {
  CodexModelSwitchReasoningEffort,
  SessionModelUpdatePayload,
} from "../session-stream-contracts";

export interface SessionModelSwitchTarget<
  TReasoningEffort extends string = CodexModelSwitchReasoningEffort,
> {
  readonly providerId: string;
  readonly targetModelId: string;
  readonly targetReasoningEffort?: TReasoningEffort;
  readonly targetThinkingLevel?: string;
  readonly thinkingEnabled?: boolean;
}

export interface SessionModelSwitchContext {
  readonly previousBinding?: SessionModelBinding | null;
  readonly sessionId: string;
  readonly workspacePath: string;
}

export interface SessionModelSwitchInjectionPayload<
  TReasoningEffort extends string = CodexModelSwitchReasoningEffort,
> {
  readonly baseInstructions?: string;
  readonly previousModelId?: string;
  readonly targetModelId: string;
  readonly targetReasoningEffort?: TReasoningEffort;
}

export interface SessionModelSwitchResult<
  TReasoningEffort extends string = CodexModelSwitchReasoningEffort,
> {
  readonly broadcastPayload: SessionModelUpdatePayload;
  readonly modelBinding: SessionModelBinding;
  readonly pendingInjection?: SessionModelSwitchInjectionPayload<TReasoningEffort>;
}

export type SessionModelSwitchValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

export interface ProviderModelSwitchStrategy<
  TReasoningEffort extends string = CodexModelSwitchReasoningEffort,
> {
  buildModelBinding(
    target: SessionModelSwitchTarget<TReasoningEffort>,
    context: SessionModelSwitchContext
  ): SessionModelBinding;
  buildSwitchInjection?(
    target: SessionModelSwitchTarget<TReasoningEffort>,
    context: SessionModelSwitchContext
  ): SessionModelSwitchInjectionPayload<TReasoningEffort> | null;
  readonly providerId: string;
  validateTarget(
    target: SessionModelSwitchTarget<TReasoningEffort>
  ): SessionModelSwitchValidationResult;
}
