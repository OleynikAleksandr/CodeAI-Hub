import type { SettingsMessage } from "../message-handlers/settings-message-handler";

interface ProviderPickerConfirmPayload {
  readonly providerIds: readonly unknown[];
}

export type WebviewCommand =
  | "newSession"
  | "lastSession"
  | "oldSessions"
  | "startChat"
  | "grabFilePathFromDrop"
  | "clearAllClipboards"
  | "custom1"
  | "custom2"
  | "custom3"
  | "custom4";

export interface CommandMessage {
  readonly command: WebviewCommand;
}

export interface LayoutMessage {
  readonly payload?: unknown;
  readonly type: "ui:updateLayout";
}

export interface ProjectManagerFileLinkOpenMessage {
  readonly payload?: unknown;
  readonly type: "pm:file-link:open";
}

export interface GenericMessage {
  readonly payload?: unknown;
  readonly type: string;
}

export interface ProviderPickerConfirmMessage {
  readonly payload: ProviderPickerConfirmPayload;
  readonly type: "providerPicker:confirm";
}

export interface ProviderPickerCancelMessage {
  readonly type: "providerPicker:cancel";
}

export type ProviderPickerMessage =
  | ProviderPickerConfirmMessage
  | ProviderPickerCancelMessage;

export type WebviewMessage =
  | CommandMessage
  | LayoutMessage
  | ProjectManagerFileLinkOpenMessage
  | ProviderPickerMessage
  | SettingsMessage
  | GenericMessage;

const hasCommandField = (message: unknown): message is CommandMessage => {
  if (!message || typeof message !== "object") {
    return false;
  }

  return typeof (message as CommandMessage).command === "string";
};

export const isCommandMessage = (
  message: WebviewMessage
): message is CommandMessage => hasCommandField(message);

export const isProviderPickerMessage = (
  message: WebviewMessage
): message is ProviderPickerMessage => {
  if (!message || typeof message !== "object") {
    return false;
  }

  const candidate = message as ProviderPickerMessage;
  return (
    candidate?.type === "providerPicker:confirm" ||
    candidate?.type === "providerPicker:cancel"
  );
};

export const isLayoutMessage = (
  message: WebviewMessage
): message is LayoutMessage => {
  if (!message || typeof message !== "object") {
    return false;
  }

  return (message as LayoutMessage).type === "ui:updateLayout";
};

export const isProjectManagerFileLinkOpenMessage = (
  message: WebviewMessage
): message is ProjectManagerFileLinkOpenMessage => {
  if (!message || typeof message !== "object") {
    return false;
  }

  return (
    (message as ProjectManagerFileLinkOpenMessage).type === "pm:file-link:open"
  );
};
