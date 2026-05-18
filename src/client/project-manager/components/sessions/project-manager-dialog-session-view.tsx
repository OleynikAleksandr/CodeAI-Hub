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
import { isDisplayOnlyKimiModelSwitch } from "../../services/switch-api";
import { useProjectManagerSettings } from "../settings/use-project-manager-settings";
export type { DialogOpenIntent } from "./project-manager-dialog-session-view-helpers";

type ClaudeThinkingSelection = ClaudeThinkingEffort | "off";
type DialogControllerClaudeSwitch = {
  readonly requestClaudeModelSwitch?: (
    modelId: ClaudeModelAliasId,
    thinking: ClaudeThinkingSelection
  ) => void;
  readonly requestClaudeThinkingSwitch?: (
    thinking: ClaudeThinkingSelection
  ) => void;
};

const isSpeechStatePayload = (payload: unknown): payload is SpeechStatePayload =>
  typeof payload === "object" &&
  payload !== null &&
  "status" in payload &&
  typeof payload.status === "string";

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
    sendMessage,
  } = controller;
  const { settings } = useProjectManagerSettings();
  const [speechState, setSpeechState] = useState<SpeechStatePayload | null>(
    null
  );
  const activeSpeechMessageId = resolveActiveSpeechMessageId(speechState);
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
      requestCodexModelSwitch(modelId);
    },
    [props.intent?.providerId, requestCodexModelSwitch, session?.providerIds]
  );

  if (!session) {
    const shouldShowPending = props.emptyStatePending === true;
    return (
      <SessionView
        activeSessionId={null}
        allSessions={[]}
        coreConnectionDetail={connection.detail}
        coreConnectionStatus={connection.status}
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
      onSendMessage={(_sessionId, content) => sendMessage(content)}
      onSpeakMessage={handleSpeakMessage}
      providerLabels={providerLabels}
      sessions={[session]}
      showThinkingMessages={showThinkingMessages}
      showEmptyState={true}
      snapshots={snapshots}
      speakingMessageId={activeSpeechMessageId}
      tokenDebugSummaryOverride={tokenDebugSummaryOverride}
    />
  );
};
export default ProjectManagerDialogSessionView;
