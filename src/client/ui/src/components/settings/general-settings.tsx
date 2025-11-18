import type { CSSProperties } from "react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import type {
  ProviderStackDescriptor,
  ProviderStackId,
} from "../../../../../types/provider";
import { isCoreBridgeStatePayload } from "../../app-host/webview-message-types";
import {
  installProviderVendorRuntime,
  refreshProviderVersions,
  requestStatusSnapshot,
  restoreProviderRuntime,
} from "../../core-bridge/core-bridge";
import { FALLBACK_PROVIDERS } from "../../core-bridge/fallback-providers";
import type { ProviderOperationPayload } from "../../core-bridge/types";
import { postVsCodeMessage } from "../../vscode";
import {
  buttonBaseStyles,
  buttonStateStyles,
  descriptionStyles,
  sectionStyles,
  statusStyles,
} from "./general-settings-styles";
import ProviderVersionsPanel, {
  type ProviderOperationState,
} from "./provider-versions";

type ButtonVisualState = "idle" | "hover" | "active" | "pending" | "success";
const RESTART_PENDING_DELAY_MS = 1500;
const RESTART_RESET_DELAY_MS = 2500;

const isProviderOperationPayload = (
  value: unknown
): value is ProviderOperationPayload => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as ProviderOperationPayload;
  if (
    candidate.operation !== "installVendor" &&
    candidate.operation !== "restoreVetted"
  ) {
    return false;
  }
  if (
    candidate.status !== "started" &&
    candidate.status !== "success" &&
    candidate.status !== "error"
  ) {
    return false;
  }
  return typeof candidate.providerId === "string";
};

const buildOperationState = (
  payload: ProviderOperationPayload
): ProviderOperationState => {
  if (payload.status === "started") {
    return {
      status: "pending",
      operation: payload.operation,
    };
  }
  if (payload.status === "success") {
    return {
      status: "success",
      operation: payload.operation,
    };
  }
  return {
    status: "error",
    operation: payload.operation,
    message: payload.message ?? "Runtime update failed.",
  };
};

const extractProviderOperationState = (
  payload: unknown
): {
  readonly providerId: ProviderStackId;
  readonly state: ProviderOperationState;
} | null => {
  if (!isProviderOperationPayload(payload)) {
    return null;
  }
  return {
    providerId: payload.providerId as ProviderStackId,
    state: buildOperationState(payload),
  };
};

const GeneralSettings = () => {
  const [buttonState, setButtonState] = useState<ButtonVisualState>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const pendingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [providers, setProviders] =
    useState<readonly ProviderStackDescriptor[]>(FALLBACK_PROVIDERS);
  const [providerOperations, setProviderOperations] = useState<
    Record<string, ProviderOperationState>
  >({});
  const hasRequestedInitialRefreshRef = useRef(false);

  useEffect(
    () => () => {
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
      }
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    const handleCoreState = (event: MessageEvent<unknown>) => {
      const raw = event.data;
      if (!raw || typeof raw !== "object") {
        return;
      }
      const candidate = raw as {
        readonly type?: unknown;
        readonly payload?: unknown;
      };
      if (candidate.type !== "core:state") {
        return;
      }
      const payload = candidate.payload;
      if (!isCoreBridgeStatePayload(payload)) {
        return;
      }
      setProviders(payload.providers);
    };

    window.addEventListener("message", handleCoreState);
    return () => {
      window.removeEventListener("message", handleCoreState);
    };
  }, []);

  useEffect(() => {
    const handleProviderOperation = (event: MessageEvent<unknown>) => {
      const raw = event.data;
      if (!raw || typeof raw !== "object") {
        return;
      }
      const candidate = raw as {
        readonly type?: unknown;
        readonly payload?: unknown;
      };
      if (candidate.type !== "provider:operation") {
        return;
      }
      const resolved = extractProviderOperationState(candidate.payload);
      if (!resolved) {
        return;
      }
      setProviderOperations((prev) => ({
        ...prev,
        [resolved.providerId]: resolved.state,
      }));
      if (resolved.state.status !== "pending") {
        refreshProviderVersions(resolved.providerId);
      }
    };
    window.addEventListener("message", handleProviderOperation);
    return () => {
      window.removeEventListener("message", handleProviderOperation);
    };
  }, []);

  useEffect(() => {
    if (hasRequestedInitialRefreshRef.current) {
      return;
    }
    hasRequestedInitialRefreshRef.current = true;
    requestStatusSnapshot();
    refreshProviderVersions();
  }, []);

  const transitionToIdle = useCallback(() => {
    setButtonState("idle");
    setStatusMessage(null);
  }, []);

  const handleRestartCore = useCallback(() => {
    if (buttonState === "pending") {
      return;
    }
    setButtonState("pending");
    setStatusMessage("Restarting core…");
    postVsCodeMessage({ type: "core:restart-request" });
    pendingTimerRef.current = setTimeout(() => {
      setButtonState("success");
      setStatusMessage(
        "Restart command sent. Waiting for CodeAI Hub to reconnect."
      );
      resetTimerRef.current = setTimeout(
        transitionToIdle,
        RESTART_RESET_DELAY_MS
      );
    }, RESTART_PENDING_DELAY_MS);
  }, [buttonState, transitionToIdle]);

  const handleInstallVendorRuntime = useCallback(
    (providerId: ProviderStackId) => {
      setProviderOperations((prev) => ({
        ...prev,
        [providerId]: { status: "pending", operation: "installVendor" },
      }));
      installProviderVendorRuntime(providerId);
    },
    []
  );

  const handleRestoreRuntime = useCallback((providerId: ProviderStackId) => {
    setProviderOperations((prev) => ({
      ...prev,
      [providerId]: { status: "pending", operation: "restoreVetted" },
    }));
    restoreProviderRuntime(providerId);
  }, []);

  const applyVisualState = (next: ButtonVisualState): void => {
    if (buttonState === "pending") {
      return;
    }
    if (buttonState === "success" && next !== "idle") {
      return;
    }
    setButtonState(next);
  };

  const getButtonStyles = (): CSSProperties => {
    if (buttonState === "idle") {
      return buttonBaseStyles;
    }
    const variant = buttonStateStyles[buttonState];
    return variant ? { ...buttonBaseStyles, ...variant } : buttonBaseStyles;
  };

  const resolveButtonLabel = (): string => {
    if (buttonState === "pending") {
      return "Restarting…";
    }
    if (buttonState === "success") {
      return "Restart requested";
    }
    return "Restart Core";
  };

  return (
    <section style={sectionStyles}>
      <h3>Core Controls</h3>
      <p style={descriptionStyles}>
        Restart the CodeAI Hub core to trigger a fresh CLI detection cycle. Use
        this option after resolving CLI authentication or quota issues.
      </p>
      <button
        disabled={buttonState === "pending"}
        onClick={handleRestartCore}
        onMouseDown={() => applyVisualState("active")}
        onMouseEnter={() => applyVisualState("hover")}
        onMouseLeave={() => applyVisualState("idle")}
        onMouseUp={() => applyVisualState("hover")}
        style={getButtonStyles()}
        type="button"
      >
        {resolveButtonLabel()}
      </button>
      {statusMessage ? (
        <output style={statusStyles}>{statusMessage}</output>
      ) : null}
      <ProviderVersionsPanel
        onInstallVendor={handleInstallVendorRuntime}
        onRestoreRuntime={handleRestoreRuntime}
        operations={providerOperations}
        providers={providers}
      />
    </section>
  );
};

export default memo(GeneralSettings);
