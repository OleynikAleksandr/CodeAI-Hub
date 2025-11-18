import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type {
  SessionBindingInfo,
  SessionRecord,
} from "../../../../types/session";
import type { SessionSnapshots } from "../session/helpers";
import type { ProviderLabels } from "./provider-picker-state";

export type SessionStoreHandlerDeps = {
  readonly providerLabels: ProviderLabels;
  readonly acceptsSession: (sessionId: string) => boolean;
  readonly applyPendingBinding: (session: SessionRecord) => SessionRecord;
  readonly filteredSessionId: string | null;
  readonly shouldFilterSessions: boolean;
  readonly sessionsRef: MutableRefObject<SessionRecord[]>;
  readonly pendingBindingsRef: MutableRefObject<
    Record<string, SessionBindingInfo>
  >;
  readonly detachedSessionsRef: MutableRefObject<Set<string>>;
  readonly setSessions: Dispatch<SetStateAction<SessionRecord[]>>;
  readonly setSnapshots: Dispatch<SetStateAction<SessionSnapshots>>;
  readonly setActiveSessionId: Dispatch<SetStateAction<string | null>>;
  readonly setDetachedSessionIds: (next: Set<string>) => void;
  readonly syncSessionsRef: (current: SessionRecord[]) => void;
};
