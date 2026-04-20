import type { CSSProperties, FC } from "react";
import type { LocalizationEngineAvailability } from "./localization-engine-availability";
import { settingsColorTokens, settingsTypographyTokens } from "./style-tokens";

interface TranslationEngineOption {
  readonly engineId: string;
}

const controlRowStyles: CSSProperties = {
  display: "grid",
  gap: "8px",
  padding: "12px",
  borderRadius: "8px",
  border: `1px solid ${settingsColorTokens.borderSubtle}`,
  background: "rgba(255, 255, 255, 0.02)",
};

const labelTitleStyles: CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: settingsColorTokens.textPrimary,
  margin: 0,
};

const labelDescriptionStyles: CSSProperties = {
  fontSize: settingsTypographyTokens.bodyFontSize,
  color: settingsColorTokens.textMuted,
  lineHeight: 1.5,
  margin: 0,
};

const availabilityHintStyles: CSSProperties = {
  fontSize: settingsTypographyTokens.bodyFontSize,
  color: settingsColorTokens.textMuted,
  lineHeight: 1.5,
  margin: 0,
};

const availabilityWarningStyles: CSSProperties = {
  border: `1px solid ${settingsColorTokens.borderStrong}`,
  borderRadius: "6px",
  background: "rgba(190, 145, 75, 0.12)",
  color: settingsColorTokens.textSecondary,
  fontSize: settingsTypographyTokens.bodyFontSize,
  lineHeight: 1.5,
  margin: 0,
  padding: "10px 12px",
};

const selectStyles: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: "36px",
  padding: "8px 10px",
  borderRadius: "6px",
  border: `1px solid ${settingsColorTokens.borderStrong}`,
  background: settingsColorTokens.surface,
  color: settingsColorTokens.textPrimary,
  fontSize: settingsTypographyTokens.bodyFontSize,
  appearance: "none",
};

interface TranslationEngineSelectorProps {
  readonly availabilityByEngineId: ReadonlyMap<
    string,
    LocalizationEngineAvailability
  >;
  readonly description: string;
  readonly hint: string;
  readonly label: string;
  readonly onChange: (engineId: string) => void;
  readonly renderEngineLabel: (engineId: string) => string;
  readonly selectedEngineId: string;
  readonly unavailableMessage: string | null;
  readonly unavailableSuffix: string;
  readonly visibleEngineOptions: readonly TranslationEngineOption[];
}

export const TranslationEngineSelector: FC<TranslationEngineSelectorProps> = ({
  availabilityByEngineId,
  description,
  hint,
  label,
  onChange,
  renderEngineLabel,
  selectedEngineId,
  unavailableMessage,
  unavailableSuffix,
  visibleEngineOptions,
}) => (
  <div style={controlRowStyles}>
    <p style={labelTitleStyles}>{label}</p>
    <p style={labelDescriptionStyles}>{description}</p>
    <select
      onChange={(event) => onChange(event.target.value)}
      style={selectStyles}
      value={selectedEngineId}
    >
      {visibleEngineOptions.map((engine) => {
        const availability = availabilityByEngineId.get(engine.engineId);
        const disabled = availability?.disabled === true;
        const optionLabel = renderEngineLabel(engine.engineId);
        return (
          <option
            disabled={disabled}
            key={engine.engineId}
            value={engine.engineId}
          >
            {disabled ? `${optionLabel} (${unavailableSuffix})` : optionLabel}
          </option>
        );
      })}
    </select>
    <p style={availabilityHintStyles}>{hint}</p>
    {unavailableMessage ? (
      <p style={availabilityWarningStyles}>{unavailableMessage}</p>
    ) : null}
  </div>
);
