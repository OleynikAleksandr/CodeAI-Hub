import { useCallback, useEffect, useRef } from "react";
import { api } from "../../api";
import SessionView from "../../../ui/src/session/session-view";
import type { FileLinkTarget } from "../../../ui/src/session/file-link-target";
import type { UsageLimitsRefreshRequest } from "../../../ui/src/session/session-id-bar";
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
  const previousSessionIdRef = useRef<string | null>(null);
  useEffect(() => {
    const currentSessionId = session?.id ?? null;
    if (previousSessionIdRef.current !== currentSessionId) {
      api.logDiagnostic({
        channel: "stop-lock-diag",
        event: "pmdiag_dialog_active_session_changed",
        context: {
          from: previousSessionIdRef.current,
          to: currentSessionId,
          providerId: props.intent?.providerId ?? null,
          stage: props.intent?.stage ?? null,
          providerSessionId: props.intent?.providerSessionId ?? null,
        },
      });
      previousSessionIdRef.current = currentSessionId;
    }
  }, [
    session?.id,
    props.intent?.providerId,
    props.intent?.stage,
    props.intent?.providerSessionId,
  ]);
  const handleRefreshUsageLimits = useCallback(
    (request: UsageLimitsRefreshRequest) => {
      api.refreshUsageLimits(request);
    },
    []
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
        onRefreshUsageLimits={handleRefreshUsageLimits}
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
      onRefreshUsageLimits={handleRefreshUsageLimits}
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
