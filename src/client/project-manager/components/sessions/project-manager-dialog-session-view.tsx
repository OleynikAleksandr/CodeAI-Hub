import SessionView from "../../../ui/src/session/session-view";
import type { DialogOpenIntent } from "./project-manager-dialog-session-view-helpers";
import { useProjectManagerDialogSessionController } from "./use-project-manager-dialog-session-controller";
export type { DialogOpenIntent } from "./project-manager-dialog-session-view-helpers";

export const ProjectManagerDialogSessionView = (props: {
  readonly intent: DialogOpenIntent | null;
  readonly onExit: () => void;
}) => {
  const { connection, providerLabels, session, snapshots, tokenDebugSummaryOverride, sendMessage } =
    useProjectManagerDialogSessionController(props.intent);

  if (!session) {
    return (
      <SessionView
        activeSessionId={null}
        allSessions={[]}
        coreConnectionDetail={connection.detail}
        coreConnectionStatus={connection.status}
        onCloseSession={() => props.onExit()}
        onSelectSession={() => {}}
        onSendMessage={() => {}}
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
      tokenDebugSummaryOverride={tokenDebugSummaryOverride}
    />
  );
};
export default ProjectManagerDialogSessionView;
