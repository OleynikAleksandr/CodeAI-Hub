const EmptyState = (props: { readonly pending: boolean }) => {
  if (props.pending) {
    return (
      <output aria-busy="true" aria-live="polite" className="session-empty">
        <div aria-hidden="true" className="session-spinner" />
        <h2 className="session-empty__title">Creating session…</h2>
        <p className="session-empty__description">
          This can take 5–10 seconds. Please wait.
        </p>
      </output>
    );
  }

  return (
    <div className="session-empty">
      <h2 className="session-empty__title">
        Start with the Description questionnaire
      </h2>
      <p className="session-empty__description">
        In Artifacts on the right, complete the questionnaire and click "Submit
        questionnaire". Pick one provider to open the Description dialog, then
        continue in the same session until `Final_Description.md` is ready.
      </p>
    </div>
  );
};

export default EmptyState;
