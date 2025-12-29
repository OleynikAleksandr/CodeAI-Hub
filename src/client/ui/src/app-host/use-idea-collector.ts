import { useCallback, useEffect, useRef } from "react";
import { IdeaCollectorService } from "../services/idea-collector-service";

type SendMessageHandler = (sessionId: string, content: string) => void;

export type UseIdeaCollectorResult = {
  readonly startCollection: (sessionId: string) => void;
  readonly sendMessage: SendMessageHandler;
};

export const useIdeaCollector = (
  fallbackSendMessage: SendMessageHandler
): UseIdeaCollectorResult => {
  const serviceRef = useRef(new IdeaCollectorService());
  const service = serviceRef.current;

  useEffect(() => {
    const handleStreamMessage = (event: MessageEvent<unknown>) => {
      const candidate = event.data as {
        readonly type?: string;
        readonly payload?: {
          readonly sessionId?: string;
          readonly event?: unknown;
        };
      };
      if (candidate?.type !== "session:stream") {
        return;
      }
      const sessionId = candidate.payload?.sessionId;
      if (typeof sessionId !== "string") {
        return;
      }
      service.handleStreamEvent(sessionId, candidate.payload?.event);
    };

    window.addEventListener("message", handleStreamMessage);
    return () => {
      window.removeEventListener("message", handleStreamMessage);
    };
  }, [service]);

  const startCollection = useCallback(
    (sessionId: string) => {
      service.startCollection(sessionId);
    },
    [service]
  );

  const sendMessage = useCallback(
    (sessionId: string, content: string) => {
      if (service.isIdeaCollectorSession(sessionId)) {
        service.continueConversation(sessionId, content);
        return;
      }
      fallbackSendMessage(sessionId, content);
    },
    [fallbackSendMessage, service]
  );

  return { startCollection, sendMessage };
};
