/**
 * Hook that listens for dialog:switch:offer events from Core
 * and provides state + actions for the SwitchRecoveryBanner.
 */

import { useCallback, useEffect, useState } from "react";
import type { DialogSwitchOfferPayload } from "../../dialog-switch-types";
import { api } from "../../api";

export type SwitchOfferState = DialogSwitchOfferPayload | null;

export const useDialogSwitchOffer = (activeSessionId: string | null) => {
  const [switchOffer, setSwitchOffer] = useState<SwitchOfferState>(null);

  useEffect(() => {
    const unsubscribe = api.onCoreEvent((message) => {
      if (message.type !== "dialog:switch:offer") {
        return;
      }
      const payload = message.payload as DialogSwitchOfferPayload | null;
      if (!payload || !activeSessionId) {
        return;
      }
      if (payload.sessionId === activeSessionId) {
        setSwitchOffer(payload);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [activeSessionId]);

  useEffect(() => {
    setSwitchOffer(null);
  }, [activeSessionId]);

  const dismissSwitchOffer = useCallback(() => {
    setSwitchOffer(null);
  }, []);

  const acceptRetryInPlace = useCallback(() => {
    if (!activeSessionId) {
      return;
    }
    api.dialogs.sendSwitchRequest(activeSessionId, "retry_in_place");
    setSwitchOffer(null);
  }, [activeSessionId]);

  const acceptSwitchTarget = useCallback(
    (target: { providerId: string; modelId: string | null; mode: string }) => {
      if (!activeSessionId) {
        return;
      }
      const mode =
        target.mode === "switch_model" || target.mode === "switch_provider"
          ? target.mode
          : "switch_model";
      api.dialogs.sendSwitchRequest(
        activeSessionId,
        mode,
        target.providerId,
        target.modelId ?? undefined
      );
      setSwitchOffer(null);
    },
    [activeSessionId]
  );

  return {
    switchOffer,
    dismissSwitchOffer,
    acceptRetryInPlace,
    acceptSwitchTarget,
  };
};
