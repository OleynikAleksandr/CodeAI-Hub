import type { SessionBindingInfo } from "../../../../types/session";

type InfoPanelProps = {
  readonly binding: SessionBindingInfo;
  readonly continuationIndex?: number | null;
};

const InfoPanel = ({ binding, continuationIndex }: InfoPanelProps) => {
  let displayText = "Session information unavailable";
  let titleText: string | undefined;
  const continuationPrefix =
    typeof continuationIndex === "number" && continuationIndex >= 2
      ? `Продолжение #${continuationIndex}  `
      : "";

  if (binding.status === "ready" && binding.providerSessionId) {
    displayText = `${continuationPrefix}Session ID: ${binding.providerSessionId}`;
    titleText = binding.providerSessionId;
  } else if (binding.status === "pending") {
    displayText = `${continuationPrefix}Waiting for provider session ID…`;
  } else if (binding.status === "failed") {
    displayText = `${continuationPrefix}Session failed to initialize`;
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
