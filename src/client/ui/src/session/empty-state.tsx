import { useLocalization } from "../app-host/use-localization";

const USER_MESSAGES_CATEGORY = "system_feedback";

const resolveIdleCopy = (
  stage: string | null,
  t: ReturnType<typeof useLocalization>["t"]
): { readonly title: string; readonly description: string } => {
  if (stage === "foundation_envelope") {
    return {
      title: t(
        USER_MESSAGES_CATEGORY,
        "session.empty_state.foundation_envelope.title",
        "Open the Foundation Envelope session"
      ),
      description: t(
        USER_MESSAGES_CATEGORY,
        "session.empty_state.foundation_envelope.description",
        "In the workflow tree on the left, use the Foundation Envelope session line to reopen the provider dialog. The artifact line should open `foundation-envelope.md`."
      ),
    };
  }

  return {
    title: t(
      USER_MESSAGES_CATEGORY,
      "session.empty_state.idle_title",
      "Start with the Description questionnaire"
    ),
    description: t(
      USER_MESSAGES_CATEGORY,
      "session.empty_state.idle_description",
      'In Artifacts on the right, complete the questionnaire and click "Submit questionnaire". Pick one provider to open the Description dialog, then continue in the same session until `Final_Description.md` is ready.'
    ),
  };
};

const EmptyState = (props: {
  readonly pending: boolean;
  readonly stage: string | null;
}) => {
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
  const idleCopy = resolveIdleCopy(props.stage, t);

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
