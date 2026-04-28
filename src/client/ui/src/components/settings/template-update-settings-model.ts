export type TemplateUpdateResolutionAction =
  | "backup-and-replace"
  | "preserve-current"
  | "replace-with-incoming";

export interface PendingTemplateUpdateView {
  readonly destinationPath: string;
  readonly destinationRelativePath: string;
  readonly id: string;
  readonly incomingPath: string;
  readonly incomingRelativePath: string;
  readonly pendingBundledHash: string;
}

export interface TemplateUpdateResolutionView {
  readonly action: TemplateUpdateResolutionAction;
  readonly backupPath?: string;
  readonly error?: string | null;
  readonly id: string;
  readonly pendingUpdates: readonly PendingTemplateUpdateView[];
  readonly status: "error" | "not_found" | "resolved";
}

export interface TemplateUpdatesViewState {
  readonly error: string | null;
  readonly lastResolution: TemplateUpdateResolutionView | null;
  readonly loading: boolean;
  readonly resolving: boolean;
  readonly updates: readonly PendingTemplateUpdateView[];
}

export interface TemplateUpdateSettingsControls {
  readonly handleTemplateUpdateResolve: (
    id: string,
    action: TemplateUpdateResolutionAction
  ) => void;
  readonly handleTemplateUpdatesLoad: () => void;
  readonly templateUpdates: TemplateUpdatesViewState;
}
