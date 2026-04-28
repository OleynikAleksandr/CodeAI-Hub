export type SessionModelBindingSource =
  | "settings_default"
  | "start_step_selection"
  | "switch_request"
  | "legacy_backfill";

export interface SessionModelBindingIdentity {
  readonly baseModelId?: string;
  readonly modelId: string;
  readonly reasoningEffort?: string;
  readonly thinkingEnabled?: boolean;
  readonly thinkingLevel?: string;
}

export interface SessionModelBindingKey {
  readonly continuityRootId?: string | null;
  readonly dialogId?: string | null;
  readonly initiativeSlug?: string | null;
  readonly providerId: string;
  readonly runSlug?: string | null;
  readonly sessionId?: string | null;
  readonly stage?: string | null;
  readonly workspacePath?: string | null;
  readonly workspaceSlug?: string | null;
}

export interface SessionModelBinding extends SessionModelBindingIdentity {
  readonly boundAt: string;
  readonly key: string;
  readonly providerId: string;
  readonly source: SessionModelBindingSource;
  readonly updatedAt: string;
}

export interface SessionModelBindingLookup extends SessionModelBindingKey {}

export interface CreateSessionModelBindingOptions
  extends SessionModelBindingKey,
    SessionModelBindingIdentity {
  readonly source: SessionModelBindingSource;
}

export interface UpdateSessionModelBindingOptions
  extends SessionModelBindingKey,
    SessionModelBindingIdentity {
  readonly source: SessionModelBindingSource;
}
