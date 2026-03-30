const generateLocalMessageId = (): string => {
  if (
    typeof globalThis.crypto !== "undefined" &&
    "randomUUID" in globalThis.crypto
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const joinUrl = (baseUrl: string, path: string): string =>
  baseUrl.endsWith("/")
    ? `${baseUrl.slice(0, -1)}${path}`
    : `${baseUrl}${path}`;

export const postSystemNotice = (sessionId: string, content: string): void => {
  window.postMessage(
    {
      type: "session:message",
      payload: {
        sessionId,
        message: {
          id: generateLocalMessageId(),
          role: "system",
          content,
          createdAt: Date.now(),
        },
      },
    },
    "*"
  );
};
