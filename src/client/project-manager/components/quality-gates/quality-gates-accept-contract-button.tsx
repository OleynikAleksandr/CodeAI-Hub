import React, { useCallback, useState } from "react";
import {
  acceptQualityGatesContract,
  type AcceptQualityGatesContractDecision,
} from "../../services/managed-stage-accept-contract-client";

export interface QualityGatesAcceptContractButtonProps {
  readonly disabledReason: string | null;
  readonly onAccepted?: () => void;
  readonly sessionId: string | null;
}

const REVISION_HINT = "Need revisions? Write them in chat.";

export const QualityGatesAcceptContractButton: React.FC<
  QualityGatesAcceptContractButtonProps
> = (props) => {
  const [pending, setPending] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const disabled =
    pending || props.sessionId === null || props.disabledReason !== null;

  const handleClick = useCallback(async () => {
    if (disabled || props.sessionId === null) {
      return;
    }
    setPending(true);
    setLastError(null);
    try {
      const decision: AcceptQualityGatesContractDecision =
        await acceptQualityGatesContract({
          sessionId: props.sessionId,
          source: "ui-button",
        });
      if (decision.kind === "rejected") {
        setLastError(decision.reasons.join(" / "));
        return;
      }
      props.onAccepted?.();
    } catch (error: unknown) {
      setLastError(error instanceof Error ? error.message : String(error));
    } finally {
      setPending(false);
    }
  }, [disabled, props]);

  const reason = props.disabledReason ?? lastError;

  return (
    <div className="pm-application-skeleton-accept pm-quality-gates-accept">
      <button
        className="pm-button pm-button--primary"
        disabled={disabled}
        onClick={handleClick}
        type="button"
      >
        {pending ? "Accepting…" : "Accept Contract"}
      </button>
      <p className="pm-application-skeleton-accept__reason">{REVISION_HINT}</p>
      {reason ? (
        <p className="pm-application-skeleton-accept__reason">{reason}</p>
      ) : null}
    </div>
  );
};
