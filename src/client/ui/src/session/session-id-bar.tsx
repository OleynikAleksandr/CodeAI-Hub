import type { SessionBindingInfo } from "../../../../types/session";

const SESSION_ID_PREFIX_LENGTH = 8;

type SessionIdBarProps = {
  readonly binding: SessionBindingInfo;
};

const resolveIdLabel = (binding: SessionBindingInfo): string => {
  if (binding.providerSessionId) {
    const shortId = binding.providerSessionId.slice(
      0,
      SESSION_ID_PREFIX_LENGTH
    );
    return `ID: ${shortId}-...`;
  }
  if (binding.status === "pending") {
    return "ID: pending...";
  }
  return "ID: unavailable";
};

const SessionIdBar = ({ binding }: SessionIdBarProps) => (
  <section className="session-panel session-id-bar">
    <span className="session-id-bar__text session-input__hint">
      {resolveIdLabel(binding)}
    </span>
  </section>
);

export default SessionIdBar;
