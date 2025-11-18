import { postVsCodeMessage } from "../vscode";

type DiagnosticPayload = {
  readonly type: "ui:diagnostic-log";
  readonly payload: {
    readonly message: string;
  };
};

export const logUiDiagnostic = (message: string): void => {
  try {
    const payload: DiagnosticPayload = {
      type: "ui:diagnostic-log",
      payload: { message },
    };
    postVsCodeMessage(payload);
  } catch {
    /* ignore logging failures */
  }
};
