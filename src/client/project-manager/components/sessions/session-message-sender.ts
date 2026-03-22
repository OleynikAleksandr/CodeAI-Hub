import { useCallback, type MutableRefObject } from "react";
import type { SessionRecord } from "../../../../types/session";
import { api } from "../../api";
import { loadWorkflowSchemaForProjectManager } from "../../services/description-submit-service";
import {
  enforceArtifactsRequired,
  isFinalizeTrigger,
} from "../../../ui/src/services/idea-collector-finalize-utils";
import { resolveSchemaStage } from "./session-schema-stage";

export const useSessionMessageSender = (
  sessionsRef: MutableRefObject<readonly SessionRecord[]>,
  workspacePath?: string
) =>
  useCallback(
    (sessionId: string, content: string) => {
      const record = sessionsRef.current.find(
        (session) => session.id === sessionId
      );
      if (
        !record ||
        !workspacePath ||
        record.workspacePath !== workspacePath
      ) {
        return;
      }
      const schemaStage = resolveSchemaStage(record?.stage);
      if (!schemaStage) {
        api.sendSessionMessage(sessionId, content);
        return;
      }
      const shouldFinalize = isFinalizeTrigger(content);
      void loadWorkflowSchemaForProjectManager(schemaStage)
        .then((schema) => {
          const outputSchema = shouldFinalize
            ? enforceArtifactsRequired(schema)
            : schema;
          api.sendSessionMessage(sessionId, content, { outputSchema });
        })
        .catch(() => {
          api.sendSessionMessage(sessionId, content);
        });
    },
    [sessionsRef, workspacePath]
  );
