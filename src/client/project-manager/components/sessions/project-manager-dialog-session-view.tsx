import type {
  ClaudeModelAliasId,
  ClaudeThinkingEffort,
} from "../../../../types/claude-model-registry";
import SessionView from "../../../ui/src/session/session-view";
import type { FileLinkTarget } from "../../../ui/src/session/file-link-target";
import type { DialogOpenIntent } from "./project-manager-dialog-session-view-helpers";
import { useProjectManagerDialogSessionController } from "./use-project-manager-dialog-session-controller";
import { useRuntimeModelSync } from "./use-runtime-model-sync";
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
  useRuntimeModelSync(session?.id ?? null, setSnapshots);

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
        onSelectModel={(_sessionId, modelId) =>
          requestCodexModelSwitch(modelId)
        }
        onSelectReasoning={(_sessionId, reasoning) =>
          requestCodexReasoningSwitch(reasoning)
        }
        onSelectSession={() => {}}
        onSendMessage={() => {}}
        emptyStatePending={shouldShowPending}
        providerLabels={new Map()}
        sessions={[]}
        showThinkingMessages={showThinkingMessages}
        showEmptyState={true}
        snapshots={{}}
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
      onSelectModel={(_sessionId, modelId) =>
        requestCodexModelSwitch(modelId)
      }
      onSelectReasoning={(_sessionId, reasoning) =>
        requestCodexReasoningSwitch(reasoning)
      }
      onSelectSession={() => {}}
      onSendMessage={(_sessionId, content) => sendMessage(content)}
      providerLabels={providerLabels}
      sessions={[session]}
      showThinkingMessages={showThinkingMessages}
      showEmptyState={true}
      snapshots={snapshots}
      tokenDebugSummaryOverride={tokenDebugSummaryOverride}
    />
  );
};
export default ProjectManagerDialogSessionView;
