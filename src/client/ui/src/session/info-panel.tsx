import type { SessionBindingInfo } from "../../../../types/session";

type InfoPanelProps = {
  readonly binding: SessionBindingInfo;
  readonly continuationIndex?: number | null;
};

const InfoPanel = ({ binding, continuationIndex }: InfoPanelProps) => {
  let displayText = "Session information unavailable";
  let titleText: string | undefined;
  const continuationLabel =
    typeof continuationIndex === "number" && continuationIndex >= 2
      ? `Continuation #${continuationIndex}`
      : null;

  if (binding.status === "ready" && binding.providerSessionId) {
    displayText = `Session ID: ${binding.providerSessionId}`;
    titleText = continuationLabel
      ? `${continuationLabel} · ${binding.providerSessionId}`
      : binding.providerSessionId;
  } else if (binding.status === "pending") {
    displayText = "Waiting for provider session ID…";
    titleText = continuationLabel ?? undefined;
  } else if (binding.status === "failed") {
    displayText = "Session failed to initialize";
    titleText = continuationLabel ?? undefined;
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
