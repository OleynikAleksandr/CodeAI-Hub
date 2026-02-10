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
  <section
    aria-label={`Session identifier ${resolveIdLabel(binding)}`}
    className="session-panel session-id-bar"
  >
    <span className="session-id-bar__id">{resolveIdLabel(binding)}</span>
    <div aria-hidden className="session-id-bar__limits">
      <div className="session-id-bar__limit-row">
        <span className="session-id-bar__limit-label">5 houers</span>
        <span className="session-id-bar__limit-bar" />
      </div>
      <div className="session-id-bar__limit-row">
        <span className="session-id-bar__limit-label">weekly</span>
        <span className="session-id-bar__limit-bar" />
      </div>
    </div>
  </section>
);

export default SessionIdBar;
