/**
 * Hook that listens for dialog:switch:offer events from Core
 * and provides state + dismiss action for the SwitchRecoveryBanner.
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
      // Only show offers for the currently visible session
      if (payload.sessionId === activeSessionId) {
        setSwitchOffer(payload);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [activeSessionId]);

  // Clear offer when session changes
  useEffect(() => {
    setSwitchOffer(null);
  }, [activeSessionId]);

  const dismissSwitchOffer = useCallback(() => {
    setSwitchOffer(null);
  }, []);

  return { switchOffer, dismissSwitchOffer };
};
