/**
 * Switch Recovery Banner — shown when a provider failure occurred
 * and recovery/switch options are available.
 */

interface SwitchTarget {
  readonly label: string;
  readonly mode: "retry_in_place" | "switch_model" | "switch_provider";
  readonly modelId: string | null;
  readonly providerId: string;
}

interface SwitchRecoveryBannerProps {
  readonly alternativeTargets: readonly SwitchTarget[];
  readonly canRetryInPlace: boolean;
  readonly onDismiss?: () => void;
  readonly onRetryInPlace?: () => void;
  readonly onSelectTarget?: (target: SwitchTarget) => void;
  readonly reason: string;
  readonly recommendedTarget: SwitchTarget | null;
}

const formatTargetLabel = (target: SwitchTarget): string => {
  if (target.mode === "retry_in_place") {
    return "Retry with current provider";
  }
  if (target.mode === "switch_model") {
    return `Switch to ${target.modelId ?? "fallback model"}`;
  }
  return `Switch to ${target.providerId}`;
};

export const SwitchRecoveryBanner = ({
  reason,
  canRetryInPlace,
  recommendedTarget,
  alternativeTargets,
  onRetryInPlace,
  onSelectTarget,
  onDismiss,
}: SwitchRecoveryBannerProps) => (
  <div className="switch-recovery-banner" role="alert">
    <div className="switch-recovery-banner__header">
      <span className="switch-recovery-banner__icon">{"\u26A0"}</span>
      <span className="switch-recovery-banner__reason">{reason}</span>
    </div>
    <div className="switch-recovery-banner__actions">
      {canRetryInPlace && onRetryInPlace && (
        <button
          className="switch-recovery-banner__action switch-recovery-banner__action--primary"
          onClick={onRetryInPlace}
          type="button"
        >
          Retry in place
        </button>
      )}
      {recommendedTarget && onSelectTarget && (
        <button
          className="switch-recovery-banner__action switch-recovery-banner__action--recommended"
          onClick={() => onSelectTarget(recommendedTarget)}
          type="button"
        >
          {formatTargetLabel(recommendedTarget)}
        </button>
      )}
      {alternativeTargets.map((target) => (
        <button
          className="switch-recovery-banner__action"
          key={`${target.providerId}-${target.mode}`}
          onClick={() => onSelectTarget?.(target)}
          type="button"
        >
          {formatTargetLabel(target)}
        </button>
      ))}
      {onDismiss && (
        <button
          className="switch-recovery-banner__action switch-recovery-banner__action--dismiss"
          onClick={onDismiss}
          type="button"
        >
          Dismiss
        </button>
      )}
    </div>
  </div>
);
