import type { SessionStoreHandlers } from "./session-store.types";
import { useSessionActionHandlers } from "./session-store-actions";
import { useSessionEventHandlers } from "./session-store-events";
import type { SessionStoreHandlerDeps } from "./session-store-handler-context";

export const useSessionStoreHandlers = (
  deps: SessionStoreHandlerDeps
): SessionStoreHandlers => {
  const eventHandlers = useSessionEventHandlers(deps);
  const actionHandlers = useSessionActionHandlers(deps);

  return {
    ...eventHandlers,
    ...actionHandlers,
  };
};
