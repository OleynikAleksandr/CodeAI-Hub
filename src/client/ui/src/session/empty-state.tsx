import { useLocalization } from "../app-host/use-localization";

const USER_MESSAGES_CATEGORY = "system_feedback";

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
  const idleTitle = t(
    USER_MESSAGES_CATEGORY,
    "session.empty_state.idle_title",
    "Start with the Description questionnaire"
  );
  const idleDescription = t(
    USER_MESSAGES_CATEGORY,
    "session.empty_state.idle_description",
    'In Artifacts on the right, complete the questionnaire and click "Submit questionnaire". Pick one provider to open the Description dialog, then continue in the same session until `Final_Description.md` is ready.'
  );

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
      <h2 className="session-empty__title">{idleTitle}</h2>
      <p className="session-empty__description">{idleDescription}</p>
    </div>
  );
};

export default EmptyState;
