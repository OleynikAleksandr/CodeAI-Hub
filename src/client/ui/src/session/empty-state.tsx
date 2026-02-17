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
      <h2 className="session-empty__title">Create your first session</h2>
      <p className="session-empty__description">
        Use the buttons above to start a session. Select one provider in the
        picker to begin.
      </p>
    </div>
  );
};

export default EmptyState;
