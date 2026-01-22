import type { SessionBindingInfo } from "../../../../types/session";

type InfoPanelProps = {
  readonly binding: SessionBindingInfo;
};

const InfoPanel = ({ binding }: InfoPanelProps) => {
  let displayText = "Session information unavailable";
  let titleText: string | undefined;

  if (binding.status === "ready" && binding.providerSessionId) {
    displayText = `Session ID: ${binding.providerSessionId}`;
    titleText = binding.providerSessionId;
  } else if (binding.status === "pending") {
    displayText = "Waiting for provider session ID…";
  } else if (binding.status === "failed") {
    displayText = "Session failed to initialize";
  }

  return (
    <section className="session-panel session-info session-info--single-line">
      <div className="session-status__row">
        <span className="session-info__text" title={titleText}>
          {displayText}
        </span>
      </div>
    </section>
  );
};

export default InfoPanel;
