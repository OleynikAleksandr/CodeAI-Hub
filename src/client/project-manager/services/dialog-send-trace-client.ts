import type {
  IncomingMessage,
  OutgoingMessage,
} from "../core-stream-message-types";

export type DialogTraceOutgoingMessage = {
  readonly type: "dialog:trace";
  readonly payload: {
    readonly event:
      | "pm.dialog_send.clicked"
      | "pm.dialog_send.ws_dispatched"
      | "pm.dialog_send.ack_received"
      | "pm.dialog_send.history_refresh_requested"
      | "pm.dialog_send.history_refresh_result";
    readonly requestId: string;
    readonly outboundAttemptId: string;
    readonly workspaceSlug: string;
    readonly dialogId: string;
    readonly contentLength?: number;
    readonly payload?: unknown;
    readonly error?: string | null;
  };
};

export type ProjectManagerOutboundMessage =
  | OutgoingMessage
  | DialogTraceOutgoingMessage;

export type DialogSendAttempt = {
  readonly requestId: string;
  readonly outboundAttemptId: string;
  readonly workspaceSlug: string;
  readonly dialogId: string;
  readonly contentLength: number;
};

type DialogSendMessage = Extract<OutgoingMessage, { readonly type: "dialog:send" }>;
type DialogHistoryMessage = Extract<
  OutgoingMessage,
  { readonly type: "dialog:history" }
>;
type DialogSendAckMessage = Extract<
  IncomingMessage,
  { readonly type: "dialog:send:ack" }
>;
type DialogHistoryResultMessage = Extract<
  IncomingMessage,
  { readonly type: "dialog:history:result" }
>;

const readOptionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value : undefined;

const readOptionalNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const isDialogSendAckMessage = (
  message: IncomingMessage
): message is DialogSendAckMessage => message.type === "dialog:send:ack";

const isDialogHistoryResultMessage = (
  message: IncomingMessage
): message is DialogHistoryResultMessage => message.type === "dialog:history:result";

export class DialogSendTraceClient {
  private readonly attemptsByRequestId = new Map<string, DialogSendAttempt>();
  private readonly pendingHistoryByDialogId = new Map<string, DialogSendAttempt>();
  private readonly historyByRequestId = new Map<string, DialogSendAttempt>();
  private readonly sendTrace: (message: DialogTraceOutgoingMessage) => void;

  constructor(sendTrace: (message: DialogTraceOutgoingMessage) => void) {
    this.sendTrace = sendTrace;
  }

  registerSendAttempt(attempt: DialogSendAttempt): void {
    this.attemptsByRequestId.set(attempt.requestId, attempt);
    this.emitTrace({
      event: "pm.dialog_send.clicked",
      requestId: attempt.requestId,
      outboundAttemptId: attempt.outboundAttemptId,
      workspaceSlug: attempt.workspaceSlug,
      dialogId: attempt.dialogId,
      contentLength: attempt.contentLength,
    });
  }

  traceDialogSendDispatch(message: DialogSendMessage): void {
    const { payload } = message;
    this.emitTrace({
      event: "pm.dialog_send.ws_dispatched",
      requestId: payload.requestId,
      outboundAttemptId: payload.outboundAttemptId,
      workspaceSlug: payload.workspaceSlug,
      dialogId: payload.dialogId,
      contentLength: payload.content.length,
    });
  }

  traceDialogHistoryDispatch(message: DialogHistoryMessage): void {
    const attempt = this.pendingHistoryByDialogId.get(message.payload.dialogId);
    if (!attempt) {
      return;
    }
    this.pendingHistoryByDialogId.delete(message.payload.dialogId);
    this.historyByRequestId.set(message.payload.requestId, attempt);
    this.emitTrace({
      event: "pm.dialog_send.history_refresh_requested",
      requestId: attempt.requestId,
      outboundAttemptId: attempt.outboundAttemptId,
      workspaceSlug: attempt.workspaceSlug,
      dialogId: attempt.dialogId,
      contentLength: attempt.contentLength,
      payload: {
        historyRequestId: message.payload.requestId,
        cursor: message.payload.cursor ?? 0,
      },
    });
  }

  handleIncomingMessage(message: IncomingMessage): void {
    if (isDialogSendAckMessage(message)) {
      this.handleDialogSendAck(message.payload);
      return;
    }
    if (isDialogHistoryResultMessage(message)) {
      this.handleDialogHistoryResult(message.payload);
    }
  }

  private handleDialogSendAck(payload: {
    readonly requestId: string;
    readonly status: "sent" | "rejected";
    readonly error: string | null;
  }): void {
    const attempt = this.attemptsByRequestId.get(payload.requestId);
    if (!attempt) {
      return;
    }
    this.emitTrace({
      event: "pm.dialog_send.ack_received",
      requestId: attempt.requestId,
      outboundAttemptId: attempt.outboundAttemptId,
      workspaceSlug: attempt.workspaceSlug,
      dialogId: attempt.dialogId,
      contentLength: attempt.contentLength,
      payload: { status: payload.status },
      error: payload.error,
    });
    if (payload.status === "sent") {
      this.pendingHistoryByDialogId.set(attempt.dialogId, attempt);
      return;
    }
    this.clearAttempt(attempt);
  }

  private handleDialogHistoryResult(payload: {
    readonly requestId: string;
    readonly lastCursor?: number;
    readonly messages: readonly unknown[];
    readonly error: string | null;
  }): void {
    const attempt = this.historyByRequestId.get(payload.requestId);
    if (!attempt) {
      return;
    }
    this.historyByRequestId.delete(payload.requestId);
    this.emitTrace({
      event: "pm.dialog_send.history_refresh_result",
      requestId: attempt.requestId,
      outboundAttemptId: attempt.outboundAttemptId,
      workspaceSlug: attempt.workspaceSlug,
      dialogId: attempt.dialogId,
      contentLength: attempt.contentLength,
      payload: {
        historyRequestId: payload.requestId,
        lastCursor: payload.lastCursor ?? null,
        messageCount: payload.messages.length,
      },
      error: payload.error,
    });
    this.clearAttempt(attempt);
  }

  private clearAttempt(attempt: DialogSendAttempt): void {
    this.attemptsByRequestId.delete(attempt.requestId);
    const pendingAttempt = this.pendingHistoryByDialogId.get(attempt.dialogId);
    if (pendingAttempt?.requestId === attempt.requestId) {
      this.pendingHistoryByDialogId.delete(attempt.dialogId);
    }
    for (const [historyRequestId, candidate] of this.historyByRequestId) {
      if (candidate.requestId === attempt.requestId) {
        this.historyByRequestId.delete(historyRequestId);
      }
    }
  }

  private emitTrace(payload: DialogTraceOutgoingMessage["payload"]): void {
    this.sendTrace({
      type: "dialog:trace",
      payload: {
        ...payload,
        contentLength: readOptionalNumber(payload.contentLength),
        payload: payload.payload,
        error: readOptionalString(payload.error),
      },
    });
  }
}

export const isDialogSendMessage = (
  message: ProjectManagerOutboundMessage
): message is DialogSendMessage => message.type === "dialog:send";

export const isDialogHistoryMessage = (
  message: ProjectManagerOutboundMessage
): message is DialogHistoryMessage => message.type === "dialog:history";
