import type { CoreBridgeSessionMessageTranslationPayload } from "../core-bridge/types";
import type { SessionSnapshots } from "./helpers";

export class SessionMessageLocalizationFacade {
  applyMessageTranslation(
    snapshots: SessionSnapshots,
    payload: CoreBridgeSessionMessageTranslationPayload
  ): SessionSnapshots {
    const snapshot = snapshots[payload.sessionId];
    if (!snapshot) {
      return snapshots;
    }

    let changed = false;
    const messages = snapshot.messages.map((message) => {
      if (message.id !== payload.messageId) {
        return message;
      }
      if (message.localizedContent === payload.localizedContent) {
        return message;
      }
      changed = true;
      return {
        ...message,
        localizedContent: payload.localizedContent,
      };
    });

    if (!changed) {
      return snapshots;
    }

    return {
      ...snapshots,
      [payload.sessionId]: {
        ...snapshot,
        messages,
      },
    };
  }
}
