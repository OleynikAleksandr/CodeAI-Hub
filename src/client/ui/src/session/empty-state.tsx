import { sessionSurfaceCopy } from "./dialog-panel";

const EmptyState = (props: { readonly pending: boolean }) => {
  if (props.pending) {
    return (
      <output aria-busy="true" aria-live="polite" className="session-empty">
        <div aria-hidden="true" className="session-spinner" />
        <h2 className="session-empty__title">
          {sessionSurfaceCopy.emptyState.pendingTitle}
        </h2>
        <p className="session-empty__description">
          {sessionSurfaceCopy.emptyState.pendingDescription}
        </p>
      </output>
    );
  }

  return (
    <div className="session-empty">
      <h2 className="session-empty__title">
        {sessionSurfaceCopy.emptyState.idleTitle}
      </h2>
      <p className="session-empty__description">
        {sessionSurfaceCopy.emptyState.idleDescription}
      </p>
    </div>
  );
};

export default EmptyState;
