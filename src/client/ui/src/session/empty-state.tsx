import { useLocalization } from "../app-host/use-localization";

const USER_MESSAGES_CATEGORY = "system_feedback";

const resolveIdleCopy = (
  t: ReturnType<typeof useLocalization>["t"]
): { readonly title: string; readonly description: string } => {
  return {
    title: t(
      USER_MESSAGES_CATEGORY,
      "session.empty_state.idle_title",
      "No active session"
    ),
    description: t(
      USER_MESSAGES_CATEGORY,
      "session.empty_state.idle_description",
      "Select a workflow step in the sidebar to start or resume a session."
    ),
  };
};

const EmptyState = (props: { readonly pending: boolean }) => {
  const { t } = useLocalization();
  const pendingTitle = t(
    USER_MESSAGES_CATEGORY,
    "session.empty_state.pending_title",
    "Creating session…"
  );
  const pendingDescription = t(
    USER_MESSAGES_CATEGORY,
    "session.empty_state.pending_description",
    "This can take 5–10 seconds. Please wait."
  );
  const idleCopy = resolveIdleCopy(t);

  if (props.pending) {
    return (
      <output aria-busy="true" aria-live="polite" className="session-empty">
        <div aria-hidden="true" className="session-spinner" />
        <h2 className="session-empty__title">{pendingTitle}</h2>
        <p className="session-empty__description">{pendingDescription}</p>
      </output>
    );
  }

  return (
    <div className="session-empty">
      <h2 className="session-empty__title">{idleCopy.title}</h2>
      <p className="session-empty__description">{idleCopy.description}</p>
    </div>
  );
};

export default EmptyState;
