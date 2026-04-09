import { useState } from "react";
import { api } from "../../api";
import {
  isWorkspaceSessionResponse,
  joinUrl,
} from "../../services/description-questionnaire-utils";
import type { DiagramProjectionNode } from "./adapters/domain-model-to-projection.types";
import type { DiagramMapModel } from "../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import { serializeDiagramMapDsl } from "../../../../../packages/core/src/workflow/diagram-dsl/markdown-dsl-serializer";
import {
  buildFlowSidecarDocument,
  serializeFlowSidecar,
} from "./flow-sidecar-types";
import type { DiagramEditorStage } from "./use-diagram-loader";

type DiagramSaveState =
  | "idle"
  | "saving"
  | "saved"
  | "error"
  | "conflict";

const WORKSPACE_SESSION_ENDPOINT = "/api/v1/orchestrator/workspace-session";
const WORKSPACE_FILE_WRITE_ENDPOINT =
  "/api/v1/orchestrator/workspace-file-write";

const sessionCache = new Map<string, string>();

const ensureWorkspaceSession = async (params: {
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly stage: DiagramEditorStage;
}): Promise<string | null> => {
  const cacheKey = `${params.workspacePath}::${params.stage}`;
  const existing = sessionCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  const httpUrl = api.getHttpUrl();
  if (!httpUrl) {
    return null;
  }

  try {
    const response = await fetch(joinUrl(httpUrl, WORKSPACE_SESSION_ENDPOINT), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspacePath: params.workspacePath,
        initiativeSlug: params.workspaceSlug,
        stage: params.stage,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as unknown;
    if (!isWorkspaceSessionResponse(payload)) {
      return null;
    }

    sessionCache.set(cacheKey, payload.sessionId);
    return payload.sessionId;
  } catch {
    return null;
  }
};

export const useDiagramPersistence = (params: {
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly stage: DiagramEditorStage;
  readonly artifactPath: string;
  readonly flowSidecarPath: string;
}): {
  readonly saveState: DiagramSaveState;
  readonly persistNodes: (payload: {
    readonly revision: string;
    readonly nodes: readonly DiagramProjectionNode[];
  }) => Promise<void>;
  readonly persistModel: (model: DiagramMapModel) => Promise<void>;
  readonly markConflict: () => void;
  readonly clearConflict: () => void;
} => {
  const [saveState, setSaveState] = useState<DiagramSaveState>("idle");

  const writeWorkspaceFile = async (
    sessionId: string,
    path: string,
    content: string
  ): Promise<boolean> => {
    const httpUrl = api.getHttpUrl();
    if (!httpUrl) {
      return false;
    }

    const response = await fetch(joinUrl(httpUrl, WORKSPACE_FILE_WRITE_ENDPOINT), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        path,
        content,
      }),
    });

    return response.ok;
  };

  const persistNodes = async (payload: {
    readonly revision: string;
    readonly nodes: readonly DiagramProjectionNode[];
  }): Promise<void> => {
    setSaveState("saving");
    const sessionId = await ensureWorkspaceSession({
      workspacePath: params.workspacePath,
      workspaceSlug: params.workspaceSlug,
      stage: params.stage,
    });
    const httpUrl = api.getHttpUrl();

    if (!sessionId || !httpUrl) {
      setSaveState("error");
      return;
    }

    try {
      const document = buildFlowSidecarDocument({
        revision: payload.revision,
        nodes: payload.nodes,
      });

      const ok = await writeWorkspaceFile(
        sessionId,
        params.flowSidecarPath,
        serializeFlowSidecar(document)
      );
      setSaveState(ok ? "saved" : "error");
      if (ok) {
        try { new BroadcastChannel("pm:diagram:sidecar-sync").postMessage("updated"); } catch { /* unsupported */ }
      }
    } catch {
      setSaveState("error");
    }
  };

  const persistModel = async (model: DiagramMapModel): Promise<void> => {
    setSaveState("saving");
    if (params.stage !== "diagram_modules") {
      setSaveState("error");
      return;
    }
    const sessionId = await ensureWorkspaceSession({
      workspacePath: params.workspacePath,
      workspaceSlug: params.workspaceSlug,
      stage: params.stage,
    });
    if (!sessionId) {
      setSaveState("error");
      return;
    }

    try {
      const ok = await writeWorkspaceFile(
        sessionId,
        params.artifactPath,
        serializeDiagramMapDsl(model)
      );
      setSaveState(ok ? "saved" : "error");
    } catch {
      setSaveState("error");
    }
  };

  return {
    saveState,
    persistNodes,
    persistModel,
    markConflict: () => {
      setSaveState("conflict");
    },
    clearConflict: () => {
      setSaveState((current) => (current === "conflict" ? "idle" : current));
    },
  };
};
