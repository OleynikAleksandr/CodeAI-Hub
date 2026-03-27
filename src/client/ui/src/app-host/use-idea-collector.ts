import { useCallback, useEffect, useRef } from "react";
import { IdeaCollectorService } from "../services/idea-collector-service";
import { IdeaQuestionnaireService } from "../services/idea-questionnaire-service";

type SendMessageHandler = (sessionId: string, content: string) => void;

export interface UseIdeaCollectorResult {
  readonly sendMessage: SendMessageHandler;
  readonly startCollection: (sessionId: string) => void;
}

export const useIdeaCollector = (
  fallbackSendMessage: SendMessageHandler
): UseIdeaCollectorResult => {
  const serviceRef = useRef(new IdeaCollectorService());
  const questionnaireServiceRef = useRef(new IdeaQuestionnaireService());
  const service = serviceRef.current;
  const questionnaireService = questionnaireServiceRef.current;

  useEffect(() => {
    interface SessionEventCandidate {
      readonly payload?: {
        readonly sessionId?: string;
        readonly event?: unknown;
        readonly message?: {
          readonly role?: string;
          readonly content?: unknown;
        };
      };
      readonly type?: string;
    }

    const handleStreamEvent = (candidate: SessionEventCandidate): boolean => {
      if (candidate.type !== "session:stream") {
        return false;
      }
      const sessionId = candidate.payload?.sessionId;
      if (typeof sessionId !== "string") {
        return true;
      }
      service.handleStreamEvent(sessionId, candidate.payload?.event);
      return true;
    };

    const handleAssistantMessage = (candidate: SessionEventCandidate): void => {
      if (candidate.type !== "session:message") {
        return;
      }
      const sessionId = candidate.payload?.sessionId;
      if (typeof sessionId !== "string") {
        return;
      }
      const message = candidate.payload?.message;
      if (message?.role !== "assistant") {
        return;
      }
      if (typeof message.content !== "string") {
        return;
      }
      service.recordAssistantMessage(sessionId, message.content);
    };

    const handleSessionEvent = (event: MessageEvent<unknown>) => {
      const candidate = event.data as SessionEventCandidate;
      if (handleStreamEvent(candidate)) {
        return;
      }
      handleAssistantMessage(candidate);
    };

    window.addEventListener("message", handleSessionEvent);
    return () => {
      window.removeEventListener("message", handleSessionEvent);
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
        if (!service.isQuestionnairePending(sessionId)) {
          const outputPaths = service.getOutputPathsForSessionId(sessionId);
          const question = service.getLastAssistantMessage(sessionId);
          if (outputPaths && question) {
            questionnaireService
              .appendClarificationAnswer(
                sessionId,
                outputPaths,
                question,
                content
              )
              .catch(() => {
                /* ignore save errors */
              });
          }
        }
        service.continueConversation(sessionId, content);
        return;
      }
      fallbackSendMessage(sessionId, content);
    },
    [fallbackSendMessage, questionnaireService, service]
  );

  return { startCollection, sendMessage };
};
