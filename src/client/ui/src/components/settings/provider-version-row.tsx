import { useState } from "react";
import type {
  ProviderStackDescriptor,
  ProviderStackId,
} from "../../../../../types/provider";
import {
  type ProviderOperationState,
  ProviderRuntimeActionsPanel,
  useProviderRuntimeActions,
} from "./provider-runtime-actions";
import {
  badgeStyles,
  buttonStyles,
  detailLabelStyles,
  detailValueStyles,
  pathStyles,
  providerCardStyles,
  providerHeaderStyles,
  providerStatusStyles,
  providerTitleStyles,
  uncheckedBadgeStyles,
  versionSectionStyles,
  versionSectionsStyles,
} from "./provider-version-styles";

export type { ProviderOperationState } from "./provider-runtime-actions";

type ProviderVersionRowProps = {
  readonly provider: ProviderStackDescriptor;
  readonly operation?: ProviderOperationState;
  readonly onInstallVendor: (providerId: ProviderStackId) => void;
  readonly onRestoreRuntime: (providerId: ProviderStackId) => void;
};

const ProviderVersionRow = ({
  provider,
  operation,
  onInstallVendor,
  onRestoreRuntime,
}: ProviderVersionRowProps): JSX.Element => {
  const [pendingAction, setPendingAction] = useState<
    "install" | "restore" | null
  >(null);
  const versionInfo = provider.versionInfo;
  const codeAiHubDetail = versionInfo?.codeAiHub;
  const vendorDetail = versionInfo?.vendor;
  const globalDetail = versionInfo?.global;
  const lastChecked = formatCheckedAt(versionInfo?.lastCheckedAt);
  const updateAvailable = Boolean(
    codeAiHubDetail?.version &&
      vendorDetail?.version &&
      codeAiHubDetail.version !== vendorDetail.version
  );
  const isUnchecked = Boolean(codeAiHubDetail?.unchecked);
  const badge = resolveBadge(updateAvailable, isUnchecked);
  const providerId = provider.id as ProviderStackId;
  const {
    installPending,
    restorePending,
    statusInfo,
    handleInstallVendorClick,
    handleRestoreRuntimeClick,
  } = useProviderRuntimeActions({
    operation,
    onInstallVendor,
    onRestoreRuntime,
    providerId,
    pendingAction,
    setPendingAction,
  });

  return (
    <div style={providerCardStyles}>
      <div style={providerHeaderStyles}>
        <div>
          <div style={providerTitleStyles}>{provider.title}</div>
          <p style={providerStatusStyles}>
            {provider.statusMessage ??
              (provider.connected ? "Connected" : "Inactive")}
          </p>
        </div>
        {badge}
      </div>
      <div style={versionSectionsStyles}>
        {renderVersionSection({
          title: "CodeAI Hub runtime",
          detail: codeAiHubDetail,
          allowCopy: true,
        })}
        {renderVersionSection({
          title: "Vendor latest (npm)",
          detail: vendorDetail,
        })}
        {renderVersionSection({
          title: "Global CLI installation",
          detail: globalDetail,
        })}
      </div>
      <ProviderRuntimeActionsPanel
        installPending={installPending}
        onInstall={handleInstallVendorClick}
        onRestore={handleRestoreRuntimeClick}
        pendingAction={pendingAction}
        restorePending={restorePending}
        showInstall={updateAvailable}
        showRestore={isUnchecked}
        statusInfo={statusInfo}
      />
      <div>
        <p style={detailLabelStyles}>Last checked</p>
        <p style={detailValueStyles}>{lastChecked}</p>
      </div>
    </div>
  );
};

const resolveBadge = (
  isUpdateAvailable: boolean,
  isUnchecked: boolean
): JSX.Element | null => {
  if (isUnchecked) {
    return <span style={uncheckedBadgeStyles}>Unchecked runtime</span>;
  }
  if (isUpdateAvailable) {
    return <span style={badgeStyles}>Update available</span>;
  }
  return null;
};

export const renderVersionSection = ({
  title,
  detail,
  allowCopy,
}: {
  readonly title: string;
  readonly detail?: { readonly version?: string; readonly cliPath?: string };
  readonly allowCopy?: boolean;
}): JSX.Element => {
  const versionLabel = detail?.version ?? "Not detected";
  const path = detail?.cliPath;
  return (
    <div style={versionSectionStyles}>
      <p style={detailLabelStyles}>{title}</p>
      <p style={detailValueStyles}>{versionLabel}</p>
      {path ? <p style={pathStyles}>{path}</p> : null}
      {allowCopy && path ? (
        <button
          onClick={() => copyToClipboard(path)}
          style={buttonStyles}
          type="button"
        >
          Copy CLI path
        </button>
      ) : null}
    </div>
  );
};

const formatCheckedAt = (value?: string): string => {
  if (!value) {
    return "Not checked yet";
  }
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const copyToClipboard = async (value: string): Promise<void> => {
  if (!value) {
    return;
  }
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
};

export default ProviderVersionRow;
