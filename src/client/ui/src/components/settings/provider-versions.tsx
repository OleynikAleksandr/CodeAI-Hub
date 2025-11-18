import type { CSSProperties } from "react";
import type {
  ProviderStackDescriptor,
  ProviderStackId,
} from "../../../../../types/provider";
import ProviderVersionRow, {
  type ProviderOperationState,
} from "./provider-version-row";

const panelStyles: CSSProperties = {
  marginTop: "32px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const headingStyles: CSSProperties = {
  margin: 0,
  fontSize: "15px",
  color: "#ffffff",
};

const descriptionStyles: CSSProperties = {
  margin: 0,
  fontSize: "13px",
  color: "#999999",
  lineHeight: 1.4,
};

const statusStyles: CSSProperties = {
  fontSize: "12px",
  color: "#cccccc",
  margin: 0,
};

const ProviderVersionsPanel = ({
  providers,
  operations,
  onInstallVendor,
  onRestoreRuntime,
}: {
  readonly providers: readonly ProviderStackDescriptor[];
  readonly operations: Record<string, ProviderOperationState | undefined>;
  readonly onInstallVendor: (providerId: ProviderStackId) => void;
  readonly onRestoreRuntime: (providerId: ProviderStackId) => void;
}): JSX.Element => (
  <section style={panelStyles}>
    <h3 style={headingStyles}>Provider Runtime Versions</h3>
    <p style={descriptionStyles}>
      CodeAI Hub automatically compares its bundled runtime with the latest
      vendor release and any globally installed CLI.
    </p>
    {providers.length === 0 ? (
      <p style={statusStyles}>Waiting for core status…</p>
    ) : (
      providers.map((provider) => (
        <ProviderVersionRow
          key={provider.id}
          onInstallVendor={onInstallVendor}
          onRestoreRuntime={onRestoreRuntime}
          operation={operations[provider.id]}
          provider={provider}
        />
      ))
    )}
  </section>
);

export type { ProviderOperationState } from "./provider-version-row";
export default ProviderVersionsPanel;
