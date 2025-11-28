import { useCallback, useRef, useState } from "react";
import type {
	SessionBindingInfo,
	SessionMessage,
	SessionRecord,
} from "../../../../types/session";
import {
	deleteSession as deleteSessionOnServer,
	sendChatMessage,
} from "../core-bridge/core-bridge";
import type {
	CoreBridgeSessionBindingPayload,
	CoreBridgeSessionMessagePayload,
	CoreBridgeStatePayload,
} from "../core-bridge/types";
import {
	appendMessageToSnapshots,
	createInitialSnapshot,
	mergeHistoryIntoSnapshots,
	normalizeBinding,
	removeSnapshot,
	type SessionSnapshots,
	toggleTodoInSnapshots,
} from "../session/helpers";
import type { ProviderLabels } from "./provider-picker-state";

type ToggleTodoHandler = (sessionId: string, todoId: string) => void;

type SendMessageHandler = (sessionId: string, content: string) => void;

type CloseSessionHandler = (sessionId: string) => void;

type SelectSessionHandler = (sessionId: string) => void;

type FocusLastSessionHandler = () => void;

type ClearSessionsHandler = () => void;

type SessionCreatedHandler = (session: SessionRecord) => void;
type CoreStateHandler = (payload: CoreBridgeStatePayload) => void;
type SessionMessageHandler = (payload: CoreBridgeSessionMessagePayload) => void;
type SessionDeletedHandler = (payload: { readonly sessionId: string }) => void;
type SessionBindingHandler = (payload: CoreBridgeSessionBindingPayload) => void;
type SessionHistoryHandler = (payload: {
	readonly sessionId: string;
	readonly messages: readonly SessionMessage[];
}) => void;

export type UseSessionStoreResult = {
	readonly sessions: readonly SessionRecord[];
	readonly snapshots: SessionSnapshots;
	readonly activeSessionId: string | null;
	readonly handleSessionCreated: SessionCreatedHandler;
	readonly hydrateFromCoreState: CoreStateHandler;
	readonly handleSessionMessageEvent: SessionMessageHandler;
	readonly handleSessionHistoryEvent: SessionHistoryHandler;
	readonly handleSessionDeleted: SessionDeletedHandler;
	readonly handleSessionBindingUpdate: SessionBindingHandler;
	readonly clearSessions: ClearSessionsHandler;
	readonly focusLastSession: FocusLastSessionHandler;
	readonly selectSession: SelectSessionHandler;
	readonly closeSession: CloseSessionHandler;
	readonly toggleTodo: ToggleTodoHandler;
	readonly sendMessage: SendMessageHandler;
};

export const useSessionStore = (
	providerLabels: ProviderLabels,
): UseSessionStoreResult => {
	const [sessions, setSessions] = useState<SessionRecord[]>([]);
	const [snapshots, setSnapshots] = useState<SessionSnapshots>({});
	const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
	const sessionsRef = useRef<SessionRecord[]>([]);
	const pendingBindingsRef = useRef<Record<string, SessionBindingInfo>>({});

	const syncSessionsRef = useCallback((current: SessionRecord[]) => {
		sessionsRef.current = current;
	}, []);

	const applyPendingBinding = useCallback(
		(session: SessionRecord): SessionRecord => {
			const pending = pendingBindingsRef.current[session.id];
			if (!pending) {
				return session;
			}
			delete pendingBindingsRef.current[session.id];
			return { ...session, binding: pending } satisfies SessionRecord;
		},
		[],
	);

	const handleSessionCreated = useCallback<SessionCreatedHandler>(
		(session) => {
			const sessionWithBinding = applyPendingBinding(session);
			setSessions((previous) => {
				const next = [...previous, sessionWithBinding];
				syncSessionsRef(next);
				return next;
			});
			setSnapshots((previous) => ({
				...previous,
				[session.id]: createInitialSnapshot(sessionWithBinding, providerLabels),
			}));
			setActiveSessionId(session.id);
		},
		[applyPendingBinding, providerLabels, syncSessionsRef],
	);

	const hydrateFromCoreState = useCallback<CoreStateHandler>(
		(payload) => {
			const nextSessions = payload.sessions.map((record) =>
				applyPendingBinding(record),
			);
			syncSessionsRef(nextSessions);
			setSessions(nextSessions);

			const nextSnapshots: SessionSnapshots = {};
			for (const session of nextSessions) {
				nextSnapshots[session.id] = createInitialSnapshot(
					session,
					providerLabels,
				);
			}
			setSnapshots(nextSnapshots);

			setActiveSessionId((current) => {
				if (current) {
					return current;
				}
				return nextSessions.at(-1)?.id ?? null;
			});
		},
		[applyPendingBinding, providerLabels, syncSessionsRef],
	);

	const handleSessionMessageEvent = useCallback<SessionMessageHandler>(
		(payload) => {
			setSnapshots((previous) => appendMessageToSnapshots(previous, payload));
		},
		[],
	);

	const handleSessionHistoryEvent = useCallback<SessionHistoryHandler>(
		(payload) => {
			setSnapshots((previous) => mergeHistoryIntoSnapshots(previous, payload));
		},
		[],
	);

	const handleSessionBindingUpdate = useCallback<SessionBindingHandler>(
		(payload) => {
			const binding = normalizeBinding({
				providerSessionId: payload.providerSessionId,
				status: payload.status,
			});

			setSessions((current) => {
				let updated = false;
				const next = current.map((session) => {
					if (session.id !== payload.sessionId) {
						return session;
					}
					updated = true;
					return { ...session, binding };
				});
				if (!updated) {
					pendingBindingsRef.current[payload.sessionId] = binding;
					return current;
				}
				syncSessionsRef(next);
				return next;
			});

			setSnapshots((previous) => {
				const current = previous[payload.sessionId];
				if (!current) {
					pendingBindingsRef.current[payload.sessionId] = binding;
					return previous;
				}
				return {
					...previous,
					[payload.sessionId]: {
						...current,
						binding,
					},
				};
			});
		},
		[syncSessionsRef],
	);

	const clearSessions = useCallback<ClearSessionsHandler>(() => {
		setSessions(() => {
			syncSessionsRef([]);
			return [];
		});
		setSnapshots({});
		setActiveSessionId(null);
	}, [syncSessionsRef]);

	const focusLastSession = useCallback<FocusLastSessionHandler>(() => {
		const last = sessionsRef.current.at(-1);
		if (last) {
			setActiveSessionId(last.id);
		}
	}, []);

	const selectSession = useCallback<SelectSessionHandler>((sessionId) => {
		setActiveSessionId(sessionId);
	}, []);

	const handleSessionDeleted = useCallback<SessionDeletedHandler>(
		(payload) => {
			const { sessionId } = payload;
			setSessions((previous) => {
				const next = previous.filter((session) => session.id !== sessionId);
				syncSessionsRef(next);
				return next;
			});
			setSnapshots((previous) => removeSnapshot(previous, sessionId));
			setActiveSessionId((current) => {
				if (current !== sessionId) {
					return current;
				}
				const remaining = sessionsRef.current.filter(
					(session) => session.id !== sessionId,
				);
				const last = remaining.at(-1);
				return last ? last.id : null;
			});
		},
		[syncSessionsRef],
	);

	const closeSession = useCallback<CloseSessionHandler>((sessionId) => {
		deleteSessionOnServer(sessionId);
	}, []);

	const toggleTodo = useCallback<ToggleTodoHandler>((sessionId, todoId) => {
		setSnapshots((previous) =>
			toggleTodoInSnapshots(previous, sessionId, todoId),
		);
	}, []);

	const sendMessage = useCallback<SendMessageHandler>((sessionId, content) => {
		setSnapshots((previous) => {
			const current = previous[sessionId];
			if (!current) {
				return previous;
			}
			return {
				...previous,
				[sessionId]: {
					...current,
					draft: "",
				},
			};
		});

		sendChatMessage(sessionId, content);
	}, []);

	return {
		sessions,
		snapshots,
		activeSessionId,
		handleSessionCreated,
		hydrateFromCoreState,
		handleSessionMessageEvent,
		handleSessionHistoryEvent,
		handleSessionDeleted,
		handleSessionBindingUpdate,
		clearSessions,
		focusLastSession,
		selectSession,
		closeSession,
		toggleTodo,
		sendMessage,
	};
};
