import type { CSSProperties } from "react";
import { memo, useEffect, useMemo, useState } from "react";
import { type VersionRow, VersionRowItem } from "./provider-version-row";
import {
  AutoUpdateToggle,
  formatCheckedAt,
  type Provider,
  resolveTargetLabel,
  type UpdatableProvider,
  WarningBanner,
} from "./provider-versions-ui";
import SettingsCard from "./settings-card";
import type { UseSettingsStateResult } from "./use-settings-state";

interface ProviderVersionsProps {
  readonly autoUpdateEnabled: boolean;
  readonly onAutoUpdateChange: (
    provider: UpdatableProvider,
    enabled: boolean
  ) => void;
  readonly onUpdate: (
    provider: UpdatableProvider,
    target: "cli" | "sdk" | "core"
  ) => void;
  readonly provider: Provider;
  readonly versions: UseSettingsStateResult["versions"];
}

const rowsContainerStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const statusStyles: CSSProperties = {
  fontSize: "12px",
  color: "#ffb86c",
  marginTop: "6px",
};

const errorStyles: CSSProperties = {
  fontSize: "12px",
  color: "#ff8a8a",
  marginTop: "6px",
};

const metadataTextStyles: CSSProperties = {
  fontSize: "12px",
  color: "#b7b7b7",
};

const ProviderVersions = ({
  provider,
  versions,
  autoUpdateEnabled,
  onAutoUpdateChange,
  onUpdate,
}: ProviderVersionsProps) => {
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);
  const snapshot = versions.data;
  const rows: VersionRow[] = useMemo(() => {
    if (!snapshot) {
      return [];
    }
    if (provider === "glmOpenCode") {
      const glmOpenCodeSnapshot = snapshot.glmOpenCode;
      if (!glmOpenCodeSnapshot) {
        return [];
      }
      return [
        {
          label: "OpenCode CLI",
          packageName: glmOpenCodeSnapshot.cli.packageName,
          currentVersion: glmOpenCodeSnapshot.cli.currentVersion,
          latestVersion: glmOpenCodeSnapshot.cli.latestVersion,
          target: undefined,
          showUpdateButton: false,
        },
        {
          label: "OpenCode SDK",
          packageName: glmOpenCodeSnapshot.sdk.packageName,
          currentVersion: glmOpenCodeSnapshot.sdk.currentVersion,
          latestVersion: glmOpenCodeSnapshot.sdk.latestVersion,
          target: undefined,
          showUpdateButton: false,
        },
      ];
    }
    const providerSnapshot =
      provider === "claude" ? snapshot.claude : snapshot.codex;
    if (!providerSnapshot) {
      return [];
    }
    const prefix = provider === "claude" ? "Claude" : "Codex";
    return [
      {
        label: `${prefix} CLI`,
        packageName: providerSnapshot.cli.packageName,
        currentVersion: providerSnapshot.cli.currentVersion,
        latestVersion: providerSnapshot.cli.latestVersion,
        target: "cli" as const,
      },
      {
        label: `${prefix} SDK`,
        packageName: providerSnapshot.sdk.packageName,
        currentVersion: providerSnapshot.sdk.currentVersion,
        latestVersion: providerSnapshot.sdk.latestVersion,
        target: "sdk" as const,
      },
    ];
  }, [provider, snapshot]);

  const hasProviderVersions = useMemo(() => {
    if (!snapshot) {
      return false;
    }
    if (provider === "glmOpenCode") {
      return Boolean(snapshot.glmOpenCode);
    }
    return provider === "claude"
      ? Boolean(snapshot.claude)
      : Boolean(snapshot.codex);
  }, [provider, snapshot]);

  const isBusy = versions.loading || versions.updatingTargets.length > 0;
  const isUpdating = (target: "cli" | "sdk" | "core") =>
    versions.updatingTargets.includes(`${provider}:${target}`);
  const isPending = (target: "cli" | "sdk" | "core") =>
    pendingTarget === `${provider}:${target}`;

  const providerUpdateTargets = useMemo(() => {
    const prefix = `${provider}:`;
    return versions.updatingTargets
      .filter((target) => target.startsWith(prefix))
      .map((target) => target.slice(prefix.length) as "cli" | "sdk" | "core");
  }, [provider, versions.updatingTargets]);

  const manualUpdateStatus = useMemo(() => {
    if (providerUpdateTargets.length === 0) {
      return null;
    }
    const labels = providerUpdateTargets.map((target) =>
      resolveTargetLabel(provider, target)
    );
    return `Manual update in progress: ${labels.join(", ")}`;
  }, [provider, providerUpdateTargets]);

  useEffect(() => {
    if (versions.updatingTargets.length === 0) {
      setPendingTarget(null);
    }
  }, [versions.updatingTargets]);

  const handleUpdate = (target: "cli" | "sdk" | "core") => {
    const key = `${provider}:${target}`;
    if (pendingTarget !== key) {
      setPendingTarget(key);
      return;
    }
    setPendingTarget(null);
    if (provider !== "glmOpenCode") {
      onUpdate(provider, target);
    }
  };

  let title = "Provider Versions";
  if (provider === "claude") {
    title = "Claude Versions";
  } else if (provider === "codex") {
    title = "Codex Versions";
  } else if (provider === "glmOpenCode") {
    title = "OpenCode Versions";
  }

  return (
    <SettingsCard
      action={
        snapshot?.checkedAt ? (
          <span style={metadataTextStyles}>
            Checked: {formatCheckedAt(snapshot.checkedAt) ?? snapshot.checkedAt}
          </span>
        ) : null
      }
      title={title}
    >
      <WarningBanner provider={provider} />
      {provider === "glmOpenCode" ? null : (
        <AutoUpdateToggle
          disabled={versions.loading}
          enabled={autoUpdateEnabled}
          onToggle={(enabled) => onAutoUpdateChange(provider, enabled)}
          provider={provider}
        />
      )}
      {versions.error ? <p style={errorStyles}>{versions.error}</p> : null}
      {versions.loading && !hasProviderVersions ? (
        <p style={statusStyles}>Loading version information…</p>
      ) : null}
      {pendingTarget ? (
        <p style={statusStyles}>
          Click the highlighted button again to confirm update. Active sessions
          will close.
        </p>
      ) : null}
      {manualUpdateStatus ? (
        <p style={statusStyles}>{manualUpdateStatus}</p>
      ) : null}
      <div style={rowsContainerStyles}>
        {rows.map((row) => (
          <VersionRowItem
            disabled={isBusy}
            isUpdating={row.target ? isUpdating(row.target) : false}
            key={row.packageName}
            onClick={
              row.target
                ? () => handleUpdate(row.target as "cli" | "sdk" | "core")
                : undefined
            }
            pendingConfirmation={
              row.target
                ? isPending(row.target as "cli" | "sdk" | "core")
                : false
            }
            row={row}
          />
        ))}
      </div>
    </SettingsCard>
  );
};

export default memo(ProviderVersions);
