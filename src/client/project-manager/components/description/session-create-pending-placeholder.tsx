type SessionCreatePendingPlaceholderProps = {
  readonly providerTitle: string;
};

export const SessionCreatePendingPlaceholder = ({
  providerTitle,
}: SessionCreatePendingPlaceholderProps) => (
  <div
    aria-live="polite"
    aria-busy="true"
    className="pm-placeholder pm-session-create-pending"
    role="status"
  >
    <div aria-hidden="true" className="pm-spinner" />
    <div className="pm-session-create-pending__title">
      Создаём сессию ({providerTitle})…
    </div>
    <div className="pm-session-create-pending__hint">
      Это может занять 5–10 секунд. Пожалуйста, подождите.
    </div>
  </div>
);

