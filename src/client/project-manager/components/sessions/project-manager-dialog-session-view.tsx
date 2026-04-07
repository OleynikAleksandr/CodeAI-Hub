import SessionView from "../../../ui/src/session/session-view";
import type { FileLinkTarget } from "../../../ui/src/session/file-link-target";
import type { DialogOpenIntent } from "./project-manager-dialog-session-view-helpers";
import { useDialogSwitchOffer } from "./use-dialog-switch-offer";
import { useProjectManagerDialogSessionController } from "./use-project-manager-dialog-session-controller";
import { useRuntimeModelSync } from "./use-runtime-model-sync";
export type { DialogOpenIntent } from "./project-manager-dialog-session-view-helpers";

const ProjectManagerDialogSessionView = (props: {
  readonly intent: DialogOpenIntent | null;
  readonly onExit: () => void;
  readonly emptyStatePending?: boolean;
  readonly onFileLinkActivate?: (target: FileLinkTarget) => void;
}) => {
  const {
    connection,
    providerLabels,
    session,
    showThinkingMessages,
    snapshots,
    setSnapshots,
    tokenDebugSummaryOverride,
    sendMessage,
  } = useProjectManagerDialogSessionController(props.intent);
  const { switchOffer, dismissSwitchOffer, acceptRetryInPlace, acceptSwitchTarget } =
    useDialogSwitchOffer(session?.id ?? null);
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
      onSelectSession={() => {}}
      onSendMessage={(_sessionId, content) => sendMessage(content)}
      providerLabels={providerLabels}
      sessions={[session]}
      showThinkingMessages={showThinkingMessages}
      showEmptyState={true}
      snapshots={snapshots}
      switchOffer={switchOffer}
      onDismissSwitchOffer={dismissSwitchOffer}
      onRetryInPlace={acceptRetryInPlace}
      onSelectSwitchTarget={acceptSwitchTarget}
      tokenDebugSummaryOverride={tokenDebugSummaryOverride}
    />
  );
};
export default ProjectManagerDialogSessionView;
