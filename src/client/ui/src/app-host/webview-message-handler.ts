import { useEffect } from "react";
import type { WebviewDispatchHandlers } from "./webview-message-dispatcher";
import { dispatchWebviewMessage } from "./webview-message-dispatcher";

export type {
	ProviderPickerOpenHandler,
	SessionCreatedHandler,
	VoidHandler,
} from "./webview-message-dispatcher";

export type WebviewMessageHandlers = WebviewDispatchHandlers;

export const useWebviewMessageHandler = ({
	onProviderPickerOpen,
	onSessionCreated,
	onSessionClearAll,
	onSessionFocusLast,
	onShowSettings,
	onCoreState,
	onCoreConnectionStatus,
	onCoreLoadingStatus,
	onSessionMessage,
	onSessionDeleted,
	onSessionBinding,
	onSessionHistory,
}: WebviewMessageHandlers) => {
	useEffect(() => {
		const handleIncomingMessage = (event: MessageEvent<unknown>) => {
			dispatchWebviewMessage(event.data, {
				onProviderPickerOpen,
				onSessionCreated,
				onSessionClearAll,
				onSessionFocusLast,
				onShowSettings,
				onCoreState,
				onCoreConnectionStatus,
				onCoreLoadingStatus,
				onSessionMessage,
				onSessionDeleted,
				onSessionBinding,
				onSessionHistory,
			});
		};

		window.addEventListener("message", handleIncomingMessage);
		return () => {
			window.removeEventListener("message", handleIncomingMessage);
		};
	}, [
		onProviderPickerOpen,
		onSessionCreated,
		onSessionClearAll,
		onSessionFocusLast,
		onShowSettings,
		onCoreState,
		onCoreConnectionStatus,
		onCoreLoadingStatus,
		onSessionMessage,
		onSessionDeleted,
		onSessionBinding,
		onSessionHistory,
	]);
};
