/**
 * Core Health Banner — shown when Core is unavailable or recovering.
 * Provides explicit crash/unavailable UX with retry/restart CTAs.
 */

type CoreHealthBannerProps = {
  readonly connectionStatus: "connecting" | "ready" | "error";
  readonly connectionDetail?: string;
  readonly onRetryConnection?: () => void;
  readonly onRestartCore?: () => void;
};

export const CoreHealthBanner = ({
  connectionStatus,
  connectionDetail,
  onRetryConnection,
  onRestartCore,
}: CoreHealthBannerProps) => {
  if (connectionStatus === "ready") {
    return null;
  }

  const isError = connectionStatus === "error";
  const bannerClass = isError
    ? "core-health-banner core-health-banner--error"
    : "core-health-banner core-health-banner--connecting";

  return (
    <div className={bannerClass} role="alert">
      <div className="core-health-banner__message">
        <span className="core-health-banner__icon">
          {isError ? "\u26A0" : "\u23F3"}
        </span>
        <span className="core-health-banner__text">
          {isError
            ? "Core is unavailable. Recovery or provider switch is not possible until Core returns."
            : (connectionDetail ?? "Connecting to CodeAI Hub core\u2026")}
        </span>
      </div>
      {(onRetryConnection || onRestartCore) && (
        <div className="core-health-banner__actions">
          {onRetryConnection && (
            <button
              className="core-health-banner__action"
              onClick={onRetryConnection}
              type="button"
            >
              Retry connection
            </button>
          )}
          {onRestartCore && (
            <button
              className="core-health-banner__action"
              onClick={onRestartCore}
              type="button"
            >
              Restart core
            </button>
          )}
        </div>
      )}
    </div>
  );
};
