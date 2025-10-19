import type { SettingsMessage } from "../message-handlers/settings-message-handler";

type ProviderPickerConfirmPayload = {
  readonly providerIds: readonly unknown[];
};

export type WebviewCommand =
  | "newSession"
  | "lastSession"
  | "clearSession"
  | "oldSessions"
  | "grabFilePathFromDrop"
  | "clearAllClipboards"
  | "custom1"
  | "custom2"
  | "custom3"
  | "custom4";

export type CommandMessage = { readonly command: WebviewCommand };

export type LayoutMessage = {
  readonly type: "ui:updateLayout";
  readonly payload?: unknown;
};

export type GenericMessage = {
  readonly type: string;
  readonly payload?: unknown;
};

export type ProviderPickerConfirmMessage = {
  readonly type: "providerPicker:confirm";
  readonly payload: ProviderPickerConfirmPayload;
};

export type ProviderPickerCancelMessage = {
  readonly type: "providerPicker:cancel";
};

export type ProviderPickerMessage =
  | ProviderPickerConfirmMessage
  | ProviderPickerCancelMessage;

export type WebviewMessage =
  | CommandMessage
  | LayoutMessage
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
