import type { ProviderStackId } from "../../../../types/provider";
import { getDefaultProviderTitle } from "../../../../types/provider";
import type { SessionRecord, SessionSnapshot } from "../../../../types/session";
import DialogPanel from "./dialog-panel";
import EmptyState from "./empty-state";
import { mapProviderTheme } from "./helpers";
import InfoPanel from "./info-panel";
import InputPanel from "./input-panel";
import SessionTabs from "./session-tabs";
import StatusPanel from "./status-panel";

type TokenUsage = {
  readonly used: number;
  readonly limit: number;
};

const resolveProviderDisplayLabel = (options: {
  readonly providerId: ProviderStackId | null;
  readonly providerLabels: ReadonlyMap<ProviderStackId, string>;
}): string | null => {
  if (!options.providerId) {
    return null;
  }
  return (
    options.providerLabels.get(options.providerId) ??
    getDefaultProviderTitle(options.providerId)
  );
};

const computeRemainingPercent = (usage: TokenUsage): number => {
  const remaining = usage.limit - usage.used;
  if (!Number.isFinite(remaining) || usage.limit <= 0) {
    return 0;
  }
  return Math.round((remaining / usage.limit) * 100);
};

const computeContinuationIndex = (
  record: SessionRecord | null,
  sessions: readonly SessionRecord[]
): number | null => {
  if (!record) {
    return null;
  }
  if (!record.continuationParentId) {
    return 1;
  }

  const sessionsById = new Map(
    sessions.map((session) => [session.id, session] as const)
  );
  const visited = new Set<string>();
  let index = 1;
  let cursor: SessionRecord | undefined = record;

  while (cursor?.continuationParentId) {
    if (visited.has(cursor.id)) {
      break;
    }
    visited.add(cursor.id);
    index += 1;
    cursor = sessionsById.get(cursor.continuationParentId);
    if (!cursor) {
      break;
    }
  }

  return Math.max(index, 2);
};

const buildSessionBanner = (options: {
  readonly session: SessionSnapshot;
  readonly continuationIndex: number | null;
}): JSX.Element | null => {
  const isRolloverBlocked =
    options.session.status.connectionState === "blocked";
  const remainingPercent = computeRemainingPercent(
    options.session.status.tokenUsage
  );
  const shouldShowRestoringBanner =
    !isRolloverBlocked &&
    typeof options.continuationIndex === "number" &&
    options.continuationIndex >= 2 &&
    !options.session.messages.some((message) => message.role === "assistant");

  if (isRolloverBlocked) {
    return (
      <output aria-live="polite" className="session-panel">
        <div>
          Контекст почти исчерпан (осталось ~{remainingPercent}%). Сейчас
          автоматически перенесу работу в новый сегмент, чтобы продолжить без
          потери качества.
        </div>
        <div>
          Шаги: 1) создаётся Continuity Report 2) открывается новая сессия 3)
          агент восстанавливает контекст (это может занять до ~6 минут).
        </div>
      </output>
    );
  }

  if (shouldShowRestoringBanner) {
    return (
      <output aria-live="polite" className="session-panel">
        Продолжение создано. Агент восстанавливает контекст (читает Continuity
        Report и ключевые файлы)… Обычно 1–6 минут.
      </output>
    );
  }

  return null;
};

type SessionViewProps = {
  readonly sessions: readonly SessionRecord[];
  readonly providerLabels: ReadonlyMap<ProviderStackId, string>;
  readonly activeSessionId: string | null;
  readonly snapshots: Readonly<Record<string, SessionSnapshot>>;
  readonly showEmptyState: boolean;
  readonly coreConnectionStatus: "connecting" | "ready" | "error";
  readonly coreConnectionDetail?: string;
  readonly onSelectSession: (sessionId: string) => void;
  readonly onCloseSession: (sessionId: string) => void;
  readonly onSendMessage: (sessionId: string, content: string) => void;
};

const SessionViewBody = ({
  sessions,
  providerLabels,
  activeSessionId,
  snapshots,
  coreConnectionStatus,
  coreConnectionDetail,
  onSelectSession,
  onCloseSession,
  onSendMessage,
}: SessionViewProps) => {
  const activeSession =
    activeSessionId && snapshots[activeSessionId]
      ? snapshots[activeSessionId]
      : null;
  const activeRecord = sessions.find(
    (session) => session.id === activeSessionId
  );
  const continuationIndex =
    typeof activeRecord?.continuationIndex === "number"
      ? activeRecord.continuationIndex
      : computeContinuationIndex(activeRecord ?? null, sessions);
  const primaryProviderId = activeRecord?.providerIds[0] ?? null;
  const providerTheme = mapProviderTheme(primaryProviderId);
  const providerDisplayLabel = resolveProviderDisplayLabel({
    providerId: primaryProviderId,
    providerLabels,
  });

  const header = (
    <div className="session-app__header">
      <SessionTabs
        activeSessionId={activeSessionId}
        onClose={onCloseSession}
        onSelect={onSelectSession}
        providerLabels={providerLabels}
        sessions={sessions}
      />
      {activeSession && activeSessionId ? (
        <InfoPanel
          binding={activeSession.binding}
          continuationIndex={continuationIndex}
        />
      ) : null}
    </div>
  );

  if (!(activeSession && activeSessionId)) {
    return (
      <div className="session-app">
        {header}
        <div className="session-app__content" />
      </div>
    );
  }

  const banner = buildSessionBanner({
    session: activeSession,
    continuationIndex,
  });
  const isRolloverBlocked = activeSession.status.connectionState === "blocked";

  return (
    <div className="session-app">
      {header}
      <div className="session-app__content">
        <div className="session-app__dialog">
          <DialogPanel
            messages={activeSession.messages}
            providerLabel={providerDisplayLabel}
            providerTheme={providerTheme}
          />
        </div>
        <div className="session-app__rails">
          {banner}
          <InputPanel
            draft={activeSession.draft}
            isBlocked={isRolloverBlocked}
            onSubmit={(text) => onSendMessage(activeSessionId, text)}
          />
          <StatusPanel
            connectionDetail={coreConnectionDetail}
            connectionStatus={coreConnectionStatus}
            status={activeSession.status}
          />
        </div>
      </div>
    </div>
  );
};

const SessionView = (props: SessionViewProps) => {
  if (props.sessions.length === 0 && props.showEmptyState) {
    return (
      <div className="session-app">
        <EmptyState />
      </div>
    );
  }

  return <SessionViewBody {...props} />;
};

export default SessionView;
