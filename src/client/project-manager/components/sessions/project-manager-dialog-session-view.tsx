import { useCallback, useEffect, useState } from "react";
import type {
  ClaudeModelAliasId,
  ClaudeThinkingEffort,
} from "../../../../types/claude-model-registry";
import SessionView from "../../../ui/src/session/session-view";
import type { FileLinkTarget } from "../../../ui/src/session/file-link-target";
import {
  buildDialogSpeechWorkbenchMessage,
  resolveActiveSpeechMessageId,
  type DialogOpenIntent,
  type SpeechStatePayload,
} from "./project-manager-dialog-session-view-helpers";
import { useProjectManagerDialogSessionController } from "./use-project-manager-dialog-session-controller";
import { useRuntimeModelSync } from "./use-runtime-model-sync";
import { api } from "../../api";
import { useWorkflowStateSnapshot } from "../../services/workflow-state-store";
import { isDisplayOnlyKimiModelSwitch } from "../../services/switch-api";
import { useProjectManagerSettings } from "../settings/use-project-manager-settings";
import { useLocalization } from "../../../ui/src/app-host/use-localization";
import type { SessionSnapshots } from "../../../ui/src/session/helpers";
export type { DialogOpenIntent } from "./project-manager-dialog-session-view-helpers";

type ClaudeThinkingSelection = ClaudeThinkingEffort | "off";
const LOCAL_MODEL_ENGINE_PREFIX = "lmstudio:";
const MANAGED_REVIEW_TAG = "managed-workflow-user-review";
const QUEUED_REVIEW_TAG = "managed-workflow-user-review-queued";
type DialogControllerClaudeSwitch = {
  readonly requestClaudeModelSwitch?: (
    modelId: ClaudeModelAliasId,
    thinking: ClaudeThinkingSelection
  ) => void;
  readonly requestClaudeThinkingSwitch?: (
    thinking: ClaudeThinkingSelection
  ) => void;
};

const formatLocalModelName = (modelKey: string): string =>
  modelKey
    .split("/")
    .pop()
    ?.replace(/[-_]+/gu, " ")
    .replace(/\b\w/gu, (match) => match.toUpperCase()) ?? modelKey;

const isSpeechStatePayload = (payload: unknown): payload is SpeechStatePayload =>
  typeof payload === "object" &&
  payload !== null &&
  "status" in payload &&
  typeof payload.status === "string";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const matchesQueuedGate = (params: {
  readonly gate: Record<string, unknown>;
  readonly intent: DialogOpenIntent | null;
  readonly sessionId: string | null;
}): boolean => {
  const intentStage = params.intent?.stage ?? null;
  const nodeId = readString(params.gate.nodeId);
  const stage = readString(params.gate.stage);
  const workflowPath = readString(params.gate.workflowPath);
  const session = isRecord(params.gate.session) ? params.gate.session : null;
  const sessionIds = [
    readString(session?.dialogId),
    readString(session?.providerSessionId),
    readString(session?.rootSessionId),
    readString(session?.sessionId),
  ];
  return Boolean(
    (params.sessionId && sessionIds.includes(params.sessionId)) ||
      (params.intent?.providerSessionId &&
        sessionIds.includes(params.intent.providerSessionId)) ||
      (intentStage &&
        (intentStage === stage ||
          intentStage === workflowPath ||
          nodeId === `workflow:${intentStage}`))
  );
};

const resolveQueuedGateLockReason = (params: {
  readonly cursor: unknown;
  readonly intent: DialogOpenIntent | null;
  readonly sessionId: string | null;
}): string | null => {
  if (!isRecord(params.cursor) || !Array.isArray(params.cursor.queuedUserGates)) {
    return null;
  }
  const gate = params.cursor.queuedUserGates.find(
    (item): item is Record<string, unknown> =>
      isRecord(item) && matchesQueuedGate({ ...params, gate: item })
  );
  return gate
    ? (readString(gate.inputLockReason) ?? "Another user gate is active.")
    : null;
};

const applyQueuedGateSnapshotLock = (
  snapshots: SessionSnapshots,
  sessionId: string,
  reason: string
): SessionSnapshots => {
  const snapshot = snapshots[sessionId];
  if (!snapshot) return snapshots;
  const now = Date.now();
  return {
    ...snapshots,
    [sessionId]: {
      ...snapshot,
      messages: snapshot.messages.map((message) =>
        message.tag === MANAGED_REVIEW_TAG
          ? { ...message, tag: QUEUED_REVIEW_TAG }
          : message
      ),
      status: {
        ...snapshot.status,
        connectionState:
          snapshot.status.connectionState === "running" ? "running" : "blocked",
        continuityLock: { active: true, reason, updatedAt: now },
        updatedAt: now,
      },
    },
  };
};

const ProjectManagerDialogSessionView = (props: {
  readonly intent: DialogOpenIntent | null;
  readonly onExit: () => void;
  readonly emptyStatePending?: boolean;
  readonly onFileLinkActivate?: (target: FileLinkTarget) => void;
}) => {
  const controller = useProjectManagerDialogSessionController(
    props.intent
  ) as ReturnType<typeof useProjectManagerDialogSessionController> &
    DialogControllerClaudeSwitch;
  const {
    connection,
    providerLabels,
    session,
    showThinkingMessages,
    snapshots,
    setSnapshots,
    tokenDebugSummaryOverride,
    requestCodexModelSwitch,
    requestCodexReasoningSwitch,
    requestClaudeModelSwitch,
    requestClaudeThinkingSwitch,
    requestLocalModelsModelSwitch,
    sendMessage,
  } = controller;
  const { settings } = useProjectManagerSettings();
  const { availableEngines } = useLocalization();
  const workflowSnapshot = useWorkflowStateSnapshot().snapshot;
  const localModelOptions = availableEngines
    .map((engine) => engine.engineId)
    .filter((engineId) => engineId.startsWith(LOCAL_MODEL_ENGINE_PREFIX))
    .map((engineId) => {
      const modelKey = engineId.slice(LOCAL_MODEL_ENGINE_PREFIX.length);
      return { id: modelKey, displayName: formatLocalModelName(modelKey) };
    });
  const [speechState, setSpeechState] = useState<SpeechStatePayload | null>(
    null
  );
  const activeSpeechMessageId = resolveActiveSpeechMessageId(speechState);
  const queuedGateLockReason = resolveQueuedGateLockReason({
    cursor: workflowSnapshot?.userGateCursor,
    intent: props.intent,
    sessionId: session?.id ?? null,
  });
  const visibleSnapshots =
    queuedGateLockReason && session
      ? applyQueuedGateSnapshotLock(
          snapshots,
          session.id,
          queuedGateLockReason
        )
      : snapshots;
  useRuntimeModelSync(session?.id ?? null, setSnapshots);
  useEffect(
    () =>
      api.onCoreEvent((message) => {
        if (
          message.type === "session:speech:state" &&
          isSpeechStatePayload(message.payload)
        ) {
          setSpeechState(message.payload);
        }
      }),
    []
  );
  const handleSpeakMessage = useCallback(
    (request: {
      readonly messageId: string;
      readonly providerId?: string | null;
      readonly sessionId: string;
      readonly text: string;
    }) => {
      api.sendWorkbenchMessage(
        buildDialogSpeechWorkbenchMessage({
          activeSpeechMessageId,
          rate: settings.general.textToSpeech.rate,
          request,
        })
      );
    },
    [activeSpeechMessageId, settings.general.textToSpeech.rate]
  );
  const handleSelectModel = useCallback(
    (modelId: string) => {
      const providerId = session?.providerIds[0] ?? props.intent?.providerId ?? null;
      if (isDisplayOnlyKimiModelSwitch({ providerId, targetModelId: modelId })) {
        return;
      }
      if (providerId === "localModels") {
        requestLocalModelsModelSwitch(modelId);
        return;
      }
      requestCodexModelSwitch(modelId);
    },
    [
      props.intent?.providerId,
      requestCodexModelSwitch,
      requestLocalModelsModelSwitch,
      session?.providerIds,
    ]
  );

  if (!session) {
    const shouldShowPending = props.emptyStatePending === true;
    return (
      <SessionView
        activeSessionId={null}
        allSessions={[]}
        coreConnectionDetail={connection.detail}
        coreConnectionStatus={connection.status}
        localModelOptions={localModelOptions}
        onCloseSession={() => props.onExit()}
        onFileLinkActivate={props.onFileLinkActivate}
        onSelectClaudeModel={(_sessionId, modelId) =>
          requestClaudeModelSwitch?.(modelId)
        }
        onSelectClaudeThinking={(_sessionId, thinking) =>
          requestClaudeThinkingSwitch?.(thinking)
        }
        onSelectModel={(_sessionId, modelId) => handleSelectModel(modelId)}
        onSelectReasoning={(_sessionId, reasoning) =>
          requestCodexReasoningSwitch(reasoning)
        }
        onSelectSession={() => {}}
        onSendMessage={() => {}}
        onSpeakMessage={handleSpeakMessage}
        emptyStatePending={shouldShowPending}
        providerLabels={new Map()}
        sessions={[]}
        showThinkingMessages={showThinkingMessages}
        showEmptyState={true}
        snapshots={{}}
        speakingMessageId={activeSpeechMessageId}
        tokenDebugSummaryOverride={undefined}
      />
    );
  }
  return (
    <SessionView
      activeSessionId={session.id}
      allSessions={[session]}
      coreConnectionDetail={connection.detail}
      coreConnectionStatus={connection.status}
      localModelOptions={localModelOptions}
      onCloseSession={() => props.onExit()}
      onFileLinkActivate={props.onFileLinkActivate}
      onSelectClaudeModel={(_sessionId, modelId) =>
        requestClaudeModelSwitch?.(modelId)
      }
      onSelectClaudeThinking={(_sessionId, thinking) =>
        requestClaudeThinkingSwitch?.(thinking)
      }
      onSelectModel={(_sessionId, modelId) => handleSelectModel(modelId)}
      onSelectReasoning={(_sessionId, reasoning) =>
        requestCodexReasoningSwitch(reasoning)
      }
      onSelectSession={() => {}}
      onSendMessage={(_sessionId, content, turnOptions) =>
        sendMessage(content, turnOptions)
      }
      onSpeakMessage={handleSpeakMessage}
      providerLabels={providerLabels}
      sessions={[session]}
      showThinkingMessages={showThinkingMessages}
      showEmptyState={true}
      snapshots={visibleSnapshots}
      speakingMessageId={activeSpeechMessageId}
      tokenDebugSummaryOverride={tokenDebugSummaryOverride}
    />
  );
};
export default ProjectManagerDialogSessionView;
