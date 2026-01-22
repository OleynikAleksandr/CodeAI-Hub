import type { WorkspaceProject } from "./types";

export type OutgoingMessage =
  | { readonly type: "projects:list" }
  | {
      readonly type: "projects:add";
      readonly payload: { readonly path: string; readonly name?: string };
    }
  | {
      readonly type: "projects:remove";
      readonly payload: { readonly id: string };
    }
  | {
      readonly type: "session:create";
      readonly payload: {
        readonly providerId?: string;
        readonly workspacePath?: string;
        readonly initiativeSlug?: string | null;
        readonly providerSessionId?: string | null;
        readonly stage?: string | null;
        readonly sessionKind?: "collector" | "reviewer" | null;
        readonly runSlug?: string | null;
      };
    }
  | {
      readonly type: "session:message";
      readonly payload: {
        readonly sessionId: string;
        readonly content:
          | string
          | {
              readonly text: string;
              readonly turnOptions?: Record<string, unknown>;
            };
      };
    }
  | { readonly type: "session:delete"; readonly payload: { readonly sessionId: string } }
  | { readonly type: "settings:load" };

export type IncomingMessage = {
  readonly type: string;
  readonly payload?: unknown;
};

export type CoreStatePayload = {
  readonly providers?: unknown;
};

export type ProjectUpdatePayload = {
  readonly projects: readonly WorkspaceProject[];
};

