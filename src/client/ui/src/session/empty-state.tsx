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

const EmptyState = (_props: { readonly pending: boolean }) => {
  const { t } = useLocalization();
  const idleCopy = resolveIdleCopy(t);

  return (
    <div className="session-empty">
      <h2 className="session-empty__title">{idleCopy.title}</h2>
      <p className="session-empty__description">{idleCopy.description}</p>
    </div>
  );
};

export default EmptyState;
