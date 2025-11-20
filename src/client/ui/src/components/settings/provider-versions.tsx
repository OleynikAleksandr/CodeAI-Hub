import type { CSSProperties } from "react";
import { memo, useEffect, useMemo, useState } from "react";
import { type VersionRow, VersionRowItem } from "./provider-version-row";
import SettingsCard from "./settings-card";
import type { UseSettingsStateResult } from "./use-settings-state";

type Provider = "claude" | "codex" | "gemini";
type ProviderVersionsProps = {
  readonly provider: Provider;
  readonly versions: UseSettingsStateResult["versions"];
  readonly onUpdate: (
    provider: Exclude<Provider, "gemini">,
    target: "cli" | "sdk"
  ) => void;
};

const warningStyles: CSSProperties = {
  background: "#3a2a1f",
  border: "1px solid #9b6b3d",
  color: "#ffd7a3",
  borderRadius: "4px",
  padding: "8px 10px",
  fontSize: "12px",
  lineHeight: 1.5,
};

const infoStyles: CSSProperties = {
  background: "#24313a",
  border: "1px solid #1f4b5a",
  color: "#c7e9ff",
  borderRadius: "4px",
  padding: "8px 10px",
  fontSize: "12px",
  lineHeight: 1.5,
};

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

const providerBannerStyles = (provider: Provider): CSSProperties => {
  if (provider === "claude") {
    return {
      background: "#312d2a",
      border: "1px solid #ff9105",
      color: "#ffb76f",
    };
  }
  if (provider === "codex") {
    return {
      background: "#293230",
      border: "1px solid #01f0d8",
      color: "#9cf8ef",
    };
  }
  return {
    background: "#2c2a2d",
    border: "1px solid #ab34cb",
    color: "#e7b3f5",
  };
};

const formatCheckedAt = (value?: string): string | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const GeminiNotice = () => (
  <div style={infoStyles}>
    Updates for Gemini are handled by application developers.
  </div>
);

const WarningBanner = ({ provider }: { readonly provider: Provider }) => (
  <div style={{ ...warningStyles, ...providerBannerStyles(provider) }}>
    Warning: Updating is at your own risk. New versions may be incompatible.
    Updating will close active sessions.
  </div>
);

const ProviderVersions = ({
  provider,
  versions,
  onUpdate,
}: ProviderVersionsProps) => {
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);
  const snapshot = versions.data;
  const rows: VersionRow[] = useMemo(() => {
    if (!snapshot) {
      return [];
    }
    if (provider === "gemini") {
      const geminiSnapshot = snapshot.gemini;
      if (!geminiSnapshot) {
        return [];
      }
      return [
        {
          label: "Gemini CLI Core",
          packageName: geminiSnapshot.core.packageName,
          currentVersion: geminiSnapshot.core.currentVersion,
          latestVersion: geminiSnapshot.core.latestVersion,
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
    if (provider === "gemini") {
      return Boolean(snapshot.gemini);
    }
    return provider === "claude"
      ? Boolean(snapshot.claude)
      : Boolean(snapshot.codex);
  }, [provider, snapshot]);

  const isBusy = versions.loading || versions.updatingTargets.length > 0;
  const isUpdating = (target: "cli" | "sdk") =>
    versions.updatingTargets.includes(`${provider}:${target}`);
  const isPending = (target: "cli" | "sdk") =>
    pendingTarget === `${provider}:${target}`;

  useEffect(() => {
    if (versions.updatingTargets.length === 0) {
      setPendingTarget(null);
    }
  }, [versions.updatingTargets]);

  const handleUpdate = (target: "cli" | "sdk") => {
    if (provider === "gemini") {
      return;
    }
    const key = `${provider}:${target}`;
    if (pendingTarget !== key) {
      setPendingTarget(key);
      return;
    }
    setPendingTarget(null);
    onUpdate(provider, target);
  };

  let title = "Gemini Versions";
  if (provider === "claude") {
    title = "Claude Versions";
  } else if (provider === "codex") {
    title = "Codex Versions";
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
      {provider !== "gemini" ? (
        <WarningBanner provider={provider} />
      ) : (
        <GeminiNotice />
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
      <div style={rowsContainerStyles}>
        {rows.map((row) => (
          <VersionRowItem
            disabled={isBusy}
            isUpdating={row.target ? isUpdating(row.target) : false}
            key={row.packageName}
            onClick={
              row.target
                ? () => handleUpdate(row.target as "cli" | "sdk")
                : undefined
            }
            pendingConfirmation={
              row.target ? isPending(row.target as "cli" | "sdk") : false
            }
            row={row}
          />
        ))}
      </div>
    </SettingsCard>
  );
};

export default memo(ProviderVersions);
