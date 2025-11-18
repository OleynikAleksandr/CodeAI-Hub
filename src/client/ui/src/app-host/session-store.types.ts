import type { SessionMessage, SessionRecord } from "../../../../types/session";
import type {
  CoreBridgeSessionBindingPayload,
  CoreBridgeSessionMessagePayload,
  CoreBridgeStatePayload,
} from "../core-bridge/types";
import type { SessionSnapshots } from "../session/helpers";

export type ToggleTodoHandler = (sessionId: string, todoId: string) => void;

export type SendMessageHandler = (sessionId: string, content: string) => void;

export type CloseSessionHandler = (sessionId: string) => void;

export type SelectSessionHandler = (sessionId: string) => void;

export type FocusLastSessionHandler = () => void;

export type ClearSessionsHandler = () => void;

export type SessionCreatedHandler = (session: SessionRecord) => void;
export type CoreStateHandler = (payload: CoreBridgeStatePayload) => void;
export type SessionMessageHandler = (
  payload: CoreBridgeSessionMessagePayload
) => void;
export type SessionDeletedHandler = (payload: {
  readonly sessionId: string;
}) => void;
export type SessionBindingHandler = (
  payload: CoreBridgeSessionBindingPayload
) => void;
export type SessionHistoryHandler = (payload: {
  readonly sessionId: string;
  readonly messages: readonly SessionMessage[];
}) => void;

export type SessionWindowStateHandler = (payload: {
  readonly sessionId: string;
  readonly mode: "attached" | "detached";
}) => void;

export type UseSessionStoreResult = {
  readonly sessions: readonly SessionRecord[];
  readonly snapshots: SessionSnapshots;
  readonly activeSessionId: string | null;
  readonly detachedSessionIds: ReadonlySet<string>;
  readonly handleSessionCreated: SessionCreatedHandler;
  readonly hydrateFromCoreState: CoreStateHandler;
  readonly handleSessionMessageEvent: SessionMessageHandler;
  readonly handleSessionHistoryEvent: SessionHistoryHandler;
  readonly handleSessionDeleted: SessionDeletedHandler;
  readonly handleSessionBindingUpdate: SessionBindingHandler;
  readonly handleSessionWindowState: SessionWindowStateHandler;
  readonly clearSessions: ClearSessionsHandler;
  readonly focusLastSession: FocusLastSessionHandler;
  readonly selectSession: SelectSessionHandler;
  readonly closeSession: CloseSessionHandler;
  readonly toggleTodo: ToggleTodoHandler;
  readonly sendMessage: SendMessageHandler;
};

export type SessionStoreHandlers = {
  readonly handleSessionCreated: SessionCreatedHandler;
  readonly hydrateFromCoreState: CoreStateHandler;
  readonly handleSessionMessageEvent: SessionMessageHandler;
  readonly handleSessionHistoryEvent: SessionHistoryHandler;
  readonly handleSessionBindingUpdate: SessionBindingHandler;
  readonly handleSessionWindowState: SessionWindowStateHandler;
  readonly clearSessions: ClearSessionsHandler;
  readonly focusLastSession: FocusLastSessionHandler;
  readonly selectSession: SelectSessionHandler;
  readonly handleSessionDeleted: SessionDeletedHandler;
  readonly closeSession: CloseSessionHandler;
  readonly toggleTodo: ToggleTodoHandler;
  readonly sendMessage: SendMessageHandler;
};
