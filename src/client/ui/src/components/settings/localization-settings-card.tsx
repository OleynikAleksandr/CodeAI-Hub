import type { CSSProperties, FC } from "react";
import { memo } from "react";
import { useLocalization } from "../../app-host/use-localization";
import LocalizationGlossaryEditor from "./localization-glossary-editor";
import { LocalizationLanguageCombobox } from "./localization-language-combobox";
import type { LocalizationLanguageOption } from "./localization-language-filter";
import SettingsCard from "./settings-card";
import type { Settings } from "./settings-state-model";
import { settingsColorTokens, settingsTypographyTokens } from "./style-tokens";
import type {
  LocalizationCategoryKey,
  LocalizationWorkflowTermsPolicy,
} from "./use-settings-state-support";

type LocalizationSettings = Settings["general"]["localization"];

interface LocalizationSettingsCardProps {
  readonly localization: LocalizationSettings;
  readonly onCategoryLanguageChange: (
    category: LocalizationCategoryKey,
    language: string
  ) => void;
  readonly onDefaultLanguageChange: (defaultLanguage: string) => void;
  readonly onEngineIdChange: (engineId: string) => void;
  readonly onGlossaryEnabledChange: (enabled: boolean) => void;
  readonly onWorkflowTermsPolicyChange: (
    workflowTermsPolicy: LocalizationWorkflowTermsPolicy
  ) => void;
}

const introStyles: CSSProperties = {
  fontSize: settingsTypographyTokens.bodyFontSize,
  color: settingsColorTokens.textSecondary,
  lineHeight: 1.5,
  margin: 0,
};

const helperStyles: CSSProperties = {
  fontSize: settingsTypographyTokens.bodyFontSize,
  color: settingsColorTokens.textMuted,
  lineHeight: 1.5,
  margin: 0,
};

const controlGridStyles: CSSProperties = {
  display: "grid",
  gap: "12px",
};

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

const inputStyles: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: "36px",
  padding: "8px 10px",
  borderRadius: "6px",
  border: `1px solid ${settingsColorTokens.borderStrong}`,
  background: settingsColorTokens.surface,
  color: settingsColorTokens.textPrimary,
  fontSize: settingsTypographyTokens.bodyFontSize,
};

const sourceLanguageOption: LocalizationLanguageOption = {
  code: "source",
  label: "Default Language (English)",
};

const toggleRowStyles: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  padding: "12px",
  borderRadius: "8px",
  border: `1px solid ${settingsColorTokens.borderSubtle}`,
  background: "rgba(255, 255, 255, 0.02)",
};

const checkboxStyles: CSSProperties = {
  width: "16px",
  height: "16px",
  marginTop: "2px",
};

const categoryFields: ReadonlyArray<{
  readonly description: string;
  readonly id: LocalizationCategoryKey;
  readonly label: string;
}> = [
  {
    id: "uiInterface",
    label: "UI Labels",
    description:
      "Buttons, tabs, section names, step names, and short interface terms.",
  },
  {
    id: "userGuidance",
    label: "UI Helper Text",
    description:
      "Short interface explanations and helper copy that clarifies labels and settings.",
  },
  {
    id: "systemFeedback",
    label: "Messages for the User",
    description:
      "Warnings, errors, hints, status updates, and other messages addressed to the user.",
  },
  {
    id: "interactiveTemplates",
    label: "Artifacts for the User",
    description:
      "Forms and final user-facing artifacts. Agent instructions and templates stay in English.",
  },
];

const LocalizationSettingsCard: FC<LocalizationSettingsCardProps> = ({
  localization,
  onCategoryLanguageChange,
  onEngineIdChange,
  onGlossaryEnabledChange,
}) => {
  const { availableEngines } = useLocalization();
  const engineOptions =
    availableEngines.length > 0
      ? availableEngines
      : [
          {
            engineId: localization.engineId,
            languages: [],
          },
        ];
  const activeEngine =
    availableEngines.find(
      (engine) => engine.engineId === localization.engineId
    ) ?? engineOptions[0];
  const languageOptions: readonly LocalizationLanguageOption[] = [
    sourceLanguageOption,
    ...(activeEngine?.languages ?? []).map((language) => ({
      code: language.code,
      label: `${language.label} (${language.code})`,
    })),
  ].filter(
    (option) => option.code.toLowerCase() !== "en" || option.code === "source"
  );
  const resolveCategoryValue = (value: string): string =>
    value.toLowerCase() === "en" ? "source" : value;

  const activeEngineId = activeEngine?.engineId ?? localization.engineId;

  const engineSelectStyles: CSSProperties = {
    ...inputStyles,
    appearance: "none",
  };

  return (
    <SettingsCard title="Localization">
      <p style={introStyles}>
        Configure which user-facing text should stay in English and which should
        be localized for the user.
      </p>
      <p style={helperStyles}>
        `Workflow Terms` now follow `UI Labels`, and `Default Language
        (English)` is the reset state for every category.
      </p>

      <div style={controlGridStyles}>
        <div style={controlRowStyles}>
          <p style={labelTitleStyles}>Translation engine</p>
          <p style={labelDescriptionStyles}>
            Engine used for bundle materialization and language-catalog lookup.
          </p>
          <select
            onChange={(event) => onEngineIdChange(event.target.value)}
            style={engineSelectStyles}
            value={activeEngineId}
          >
            {engineOptions.map((engine) => (
              <option key={engine.engineId} value={engine.engineId}>
                {engine.engineId}
              </option>
            ))}
          </select>
        </div>

        <label style={toggleRowStyles}>
          <input
            checked={localization.glossaryEnabled}
            onChange={(event) => onGlossaryEnabledChange(event.target.checked)}
            style={checkboxStyles}
            type="checkbox"
          />
          <div style={{ flex: 1 }}>
            <p style={labelTitleStyles}>Glossary protection</p>
            <p style={labelDescriptionStyles}>
              Keep protected terms, provider names, and product vocabulary
              stable during localization.
            </p>
          </div>
        </label>

        <LocalizationGlossaryEditor
          glossaryEnabled={localization.glossaryEnabled}
        />

        {categoryFields.map((category) => (
          <div key={category.id} style={controlRowStyles}>
            <p style={labelTitleStyles}>{category.label}</p>
            <p style={labelDescriptionStyles}>{category.description}</p>
            <LocalizationLanguageCombobox
              onChange={(value) => onCategoryLanguageChange(category.id, value)}
              options={languageOptions}
              placeholder="Default Language (English)"
              value={resolveCategoryValue(localization.categories[category.id])}
            />
          </div>
        ))}
      </div>
    </SettingsCard>
  );
};

export default memo(LocalizationSettingsCard);
