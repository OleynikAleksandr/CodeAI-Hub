import SessionView from "../../../ui/src/session/session-view";
import type { DialogOpenIntent } from "./project-manager-dialog-session-view-helpers";
import { useDialogSwitchOffer } from "./use-dialog-switch-offer";
import { useProjectManagerDialogSessionController } from "./use-project-manager-dialog-session-controller";
export type { DialogOpenIntent } from "./project-manager-dialog-session-view-helpers";

export const ProjectManagerDialogSessionView = (props: {
  readonly intent: DialogOpenIntent | null;
  readonly onExit: () => void;
  readonly emptyStatePending?: boolean;
}) => {
  const { connection, providerLabels, session, snapshots, tokenDebugSummaryOverride, sendMessage } =
    useProjectManagerDialogSessionController(props.intent);
  const { switchOffer, dismissSwitchOffer, acceptRetryInPlace, acceptSwitchTarget } =
    useDialogSwitchOffer(session?.id ?? null);

  if (!session) {
    const shouldShowPending = props.emptyStatePending === true;
    return (
      <SessionView
        activeSessionId={null}
        allSessions={[]}
        coreConnectionDetail={connection.detail}
        coreConnectionStatus={connection.status}
        onCloseSession={() => props.onExit()}
        onSelectSession={() => {}}
        onSendMessage={() => {}}
        emptyStatePending={shouldShowPending}
        providerLabels={new Map()}
        sessions={[]}
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
      onSelectSession={() => {}}
      onSendMessage={(_sessionId, content) => sendMessage(content)}
      providerLabels={providerLabels}
      sessions={[session]}
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
