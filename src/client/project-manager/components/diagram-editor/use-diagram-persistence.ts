import { useState } from "react";
import { api } from "../../api";
import {
  isWorkspaceSessionResponse,
  joinUrl,
} from "../../services/description-questionnaire-utils";
import type { DiagramFlowNode } from "./adapters/domain-model-to-react-flow.types";
import {
  buildFlowSidecarDocument,
  serializeFlowSidecar,
} from "./flow-sidecar-types";
import type { DiagramEditorStage } from "./use-diagram-loader";
import type { DiagramSaveState } from "./save-status-indicator";

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
  readonly flowSidecarPath: string;
}): {
  readonly saveState: DiagramSaveState;
  readonly persistNodes: (payload: {
    readonly revision: string;
    readonly nodes: readonly DiagramFlowNode[];
  }) => Promise<void>;
} => {
  const [saveState, setSaveState] = useState<DiagramSaveState>("idle");

  const persistNodes = async (payload: {
    readonly revision: string;
    readonly nodes: readonly DiagramFlowNode[];
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

      const response = await fetch(
        joinUrl(httpUrl, WORKSPACE_FILE_WRITE_ENDPOINT),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            path: params.flowSidecarPath,
            content: serializeFlowSidecar(document),
          }),
        }
      );

      setSaveState(response.ok ? "saved" : "error");
    } catch {
      setSaveState("error");
    }
  };

  return {
    saveState,
    persistNodes,
  };
};
