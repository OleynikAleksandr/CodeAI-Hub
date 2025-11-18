import type { Dispatch, SetStateAction } from "react";
import type { ProviderStackId } from "../../../../../types/provider";
import {
  actionButtonStyles,
  actionsContainerStyles,
  dangerButtonStyles,
  operationErrorStyles,
  operationStatusStyles,
  riskWarningStyles,
} from "./provider-version-styles";

export type ProviderOperationState = {
  readonly status: "pending" | "success" | "error";
  readonly operation: "installVendor" | "restoreVetted";
  readonly message?: string;
};

export const ProviderRuntimeActionsPanel = ({
  showInstall,
  showRestore,
  installPending,
  restorePending,
  statusInfo,
  pendingAction,
  onInstall,
  onRestore,
}: {
  readonly showInstall: boolean;
  readonly showRestore: boolean;
  readonly installPending: boolean;
  readonly restorePending: boolean;
  readonly statusInfo: {
    readonly message: string | null;
    readonly isError: boolean;
  };
  readonly pendingAction: "install" | "restore" | null;
  readonly onInstall: () => void;
  readonly onRestore: () => void;
}): JSX.Element | null => {
  if (!(showInstall || showRestore || statusInfo.message)) {
    return null;
  }
  return (
    <div style={actionsContainerStyles}>
      {renderInstallButton({
        showInstall,
        installPending,
        pendingAction,
        onInstall,
      })}
      {renderRestoreButton({
        showRestore,
        restorePending,
        pendingAction,
        onRestore,
      })}
      {statusInfo.message ? (
        <p
          style={
            statusInfo.isError ? operationErrorStyles : operationStatusStyles
          }
        >
          {statusInfo.message}
        </p>
      ) : null}
      {pendingAction === "install" ? (
        <p style={riskWarningStyles}>
          Unchecked vendor versions are not vetted by CodeAI Hub. Confirm only
          if you trust the source, understand the risks, and reviewed the
          provider runtime policy in the documentation.
        </p>
      ) : null}
    </div>
  );
};

const renderInstallButton = ({
  showInstall,
  installPending,
  pendingAction,
  onInstall,
}: {
  readonly showInstall: boolean;
  readonly installPending: boolean;
  readonly pendingAction: "install" | "restore" | null;
  readonly onInstall: () => void;
}): JSX.Element | null => {
  if (!showInstall) {
    return null;
  }
  return (
    <button
      disabled={installPending}
      onClick={onInstall}
      style={actionButtonStyles}
      type="button"
    >
      {resolveInstallLabel(installPending, pendingAction)}
    </button>
  );
};

const renderRestoreButton = ({
  showRestore,
  restorePending,
  pendingAction,
  onRestore,
}: {
  readonly showRestore: boolean;
  readonly restorePending: boolean;
  readonly pendingAction: "install" | "restore" | null;
  readonly onRestore: () => void;
}): JSX.Element | null => {
  if (!showRestore) {
    return null;
  }
  return (
    <button
      disabled={restorePending}
      onClick={onRestore}
      style={dangerButtonStyles}
      type="button"
    >
      {resolveRestoreLabel(restorePending, pendingAction)}
    </button>
  );
};

export const useProviderRuntimeActions = ({
  operation,
  onInstallVendor,
  onRestoreRuntime,
  providerId,
  pendingAction,
  setPendingAction,
}: {
  readonly operation?: ProviderOperationState;
  readonly onInstallVendor: (providerId: ProviderStackId) => void;
  readonly onRestoreRuntime: (providerId: ProviderStackId) => void;
  readonly providerId: ProviderStackId;
  readonly pendingAction: "install" | "restore" | null;
  readonly setPendingAction: Dispatch<
    SetStateAction<"install" | "restore" | null>
  >;
}): {
  readonly installPending: boolean;
  readonly restorePending: boolean;
  readonly statusInfo: {
    readonly message: string | null;
    readonly isError: boolean;
  };
  readonly handleInstallVendorClick: () => void;
  readonly handleRestoreRuntimeClick: () => void;
} => {
  const installPending =
    operation?.status === "pending" && operation.operation === "installVendor";
  const restorePending =
    operation?.status === "pending" && operation.operation === "restoreVetted";
  const statusInfo = resolveOperationStatus(operation);

  const handleInstallVendorClick = (): void => {
    if (installPending) {
      return;
    }
    if (pendingAction === "install") {
      setPendingAction(null);
      onInstallVendor(providerId);
      return;
    }
    setPendingAction("install");
  };

  const handleRestoreRuntimeClick = (): void => {
    if (restorePending) {
      return;
    }
    if (pendingAction === "restore") {
      setPendingAction(null);
      onRestoreRuntime(providerId);
      return;
    }
    setPendingAction("restore");
  };

  return {
    installPending,
    restorePending,
    statusInfo,
    handleInstallVendorClick,
    handleRestoreRuntimeClick,
  };
};

const resolveOperationStatus = (
  operation?: ProviderOperationState
): { readonly message: string | null; readonly isError: boolean } => {
  if (!operation) {
    return { message: null, isError: false };
  }
  if (operation.status === "pending") {
    const message =
      operation.operation === "installVendor"
        ? "Installing vendor runtime…"
        : "Restoring vetted runtime…";
    return { message, isError: false };
  }
  if (operation.status === "success") {
    const message =
      operation.operation === "installVendor"
        ? "Vendor runtime installed."
        : "CodeAI Hub runtime restored.";
    return { message, isError: false };
  }
  return {
    message: operation.message ?? "Runtime update failed.",
    isError: true,
  };
};

const resolveInstallLabel = (
  installPending: boolean,
  pendingAction: "install" | "restore" | null
): string => {
  if (installPending) {
    return "Installing…";
  }
  if (pendingAction === "install") {
    return "Confirm vendor install";
  }
  return "Install vendor version";
};

const resolveRestoreLabel = (
  restorePending: boolean,
  pendingAction: "install" | "restore" | null
): string => {
  if (restorePending) {
    return "Restoring…";
  }
  if (pendingAction === "restore") {
    return "Confirm runtime restore";
  }
  return "Restore CodeAI Hub runtime";
};
