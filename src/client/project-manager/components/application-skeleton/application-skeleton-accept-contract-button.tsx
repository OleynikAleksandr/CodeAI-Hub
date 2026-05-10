import React, { useCallback, useState } from "react";
import {
  acceptApplicationSkeletonContract,
  type AcceptApplicationSkeletonContractDecision,
} from "../../services/managed-stage-accept-contract-client";

export interface ApplicationSkeletonAcceptContractButtonProps {
  readonly disabledReason: string | null;
  readonly onAccepted?: () => void;
  readonly sessionId: string | null;
}

// "Accept Contract" button for the Application Skeleton stage. Disabled-state
// reasons must already be derived by the parent from the workflow-state
// read-model — this component never queries Core gating logic on its own.

export const ApplicationSkeletonAcceptContractButton: React.FC<
  ApplicationSkeletonAcceptContractButtonProps
> = (props) => {
  const [pending, setPending] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const disabled = pending || props.sessionId === null || props.disabledReason !== null;

  const handleClick = useCallback(async () => {
    if (disabled || props.sessionId === null) {
      return;
    }
    setPending(true);
    setLastError(null);
    try {
      const decision: AcceptApplicationSkeletonContractDecision =
        await acceptApplicationSkeletonContract({
          sessionId: props.sessionId,
          source: "ui-button",
        });
      if (decision.kind === "rejected") {
        setLastError(decision.reasons.join(" / "));
        return;
      }
      props.onAccepted?.();
    } catch (error: unknown) {
      setLastError(
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      setPending(false);
    }
  }, [disabled, props]);

  const reason = props.disabledReason ?? lastError;

  return (
    <div className="pm-application-skeleton-accept">
      <button
        className="pm-button pm-button--primary"
        disabled={disabled}
        onClick={handleClick}
        type="button"
      >
        {pending ? "Accepting…" : "Accept Contract"}
      </button>
      {reason ? (
        <p className="pm-application-skeleton-accept__reason">{reason}</p>
      ) : null}
    </div>
  );
};
