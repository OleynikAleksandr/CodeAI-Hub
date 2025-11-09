import type { OutputChannel } from "vscode";
import type { CoreConnectionInfo } from "./core-connection-info";

export function notifyConnectionListeners(
  subscribers: Iterable<(info: CoreConnectionInfo) => void>,
  connectionInfo: CoreConnectionInfo,
  channel: OutputChannel
): void {
  for (const subscriber of subscribers) {
    try {
      subscriber(connectionInfo);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      channel.appendLine(
        `Connection listener failed: ${reason ?? "unknown error"}.`
      );
    }
  }
}

export function notifyExitListeners(
  subscribers: Iterable<() => void>,
  channel: OutputChannel
): void {
  for (const subscriber of subscribers) {
    try {
      subscriber();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      channel.appendLine(
        `Process exit listener failed: ${reason ?? "unknown error"}.`
      );
    }
  }
}
