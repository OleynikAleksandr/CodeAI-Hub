import type { SessionBindingInfo } from "../../../../types/session";

type InfoPanelProps = {
  readonly binding: SessionBindingInfo;
};

const InfoPanel = ({ binding }: InfoPanelProps) => {
  let primaryText = "Session information unavailable";
  let secondaryText = "Provider session state is unknown.";
  let secondaryTitle: string | undefined;

  if (binding.status === "ready" && binding.providerSessionId) {
    primaryText = "Session ID";
    secondaryText = binding.providerSessionId;
    secondaryTitle = binding.providerSessionId;
  } else if (binding.status === "pending") {
    primaryText = "Waiting for provider session ID…";
    secondaryText = "The provider has not confirmed the session yet.";
  } else if (binding.status === "failed") {
    primaryText = "Session failed to initialize";
    secondaryText = "Provider session ID unavailable. Check CLI logs.";
  }

  return (
    <section className="session-panel session-info">
      <div className="session-status__row">
        <span className="session-info__text">{primaryText}</span>
      </div>
      <div className="session-status__row">
        <span className="session-info__text" title={secondaryTitle}>
          {secondaryText}
        </span>
      </div>
    </section>
  );
};

export default InfoPanel;
