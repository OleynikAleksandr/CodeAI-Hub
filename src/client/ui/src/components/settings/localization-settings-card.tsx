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
  label: "source",
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

const policyGroupStyles: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const policyButtonBaseStyles: CSSProperties = {
  minHeight: "34px",
  padding: "0 12px",
  borderRadius: "999px",
  border: `1px solid ${settingsColorTokens.borderStrong}`,
  background: settingsColorTokens.surface,
  color: settingsColorTokens.textSecondary,
  cursor: "pointer",
  fontSize: settingsTypographyTokens.bodyFontSize,
};

const categoryFields: ReadonlyArray<{
  readonly description: string;
  readonly id: LocalizationCategoryKey;
  readonly label: string;
}> = [
  {
    id: "uiInterface",
    label: "UI Interface",
    description: "Buttons, labels, menus, tabs, and settings surfaces.",
  },
  {
    id: "userGuidance",
    label: "User Guidance",
    description: "Help text, hints, onboarding copy, and explanatory guidance.",
  },
  {
    id: "workflowTerms",
    label: "Workflow Terms",
    description: "Step names, taxonomy labels, and product workflow language.",
  },
  {
    id: "systemFeedback",
    label: "System Feedback",
    description: "Status messages, warnings, errors, and empty states.",
  },
  {
    id: "interactiveTemplates",
    label: "Interactive Templates",
    description:
      "Questionnaires, editable product-authored forms, and templates.",
  },
];

const policyOptions: ReadonlyArray<{
  readonly description: string;
  readonly id: LocalizationWorkflowTermsPolicy;
  readonly label: string;
}> = [
  {
    id: "keep_english",
    label: "Keep English",
    description:
      "Preserve workflow taxonomy terms such as Description and Virtual Simulation.",
  },
  {
    id: "translate",
    label: "Translate",
    description:
      "Allow workflow taxonomy terms to be localized like other product copy.",
  },
];

const LocalizationSettingsCard: FC<LocalizationSettingsCardProps> = ({
  localization,
  onCategoryLanguageChange,
  onDefaultLanguageChange,
  onEngineIdChange,
  onGlossaryEnabledChange,
  onWorkflowTermsPolicyChange,
}) => {
  const { availableEngines } = useLocalization();
  const activeEngine = availableEngines.find(
    (engine) => engine.engineId === localization.engineId
  );
  const languageOptions: readonly LocalizationLanguageOption[] = [
    sourceLanguageOption,
    ...(activeEngine?.languages ?? []).map((language) => ({
      code: language.code,
      label: `${language.label} (${language.code})`,
    })),
  ];

  return (
    <SettingsCard title="Localization">
      <p style={introStyles}>
        Configure how each product copy category should be shown. Use{" "}
        <code>source</code> to keep the canonical English source copy.
      </p>
      <p style={helperStyles}>
        Language search is now catalog-backed for the active engine. Engine
        selector semantics are finalized in the next refinement step.
      </p>

      <div style={controlGridStyles}>
        <div style={controlRowStyles}>
          <p style={labelTitleStyles}>Default language</p>
          <p style={labelDescriptionStyles}>
            Fallback language for categories that do not have their own
            override.
          </p>
          <LocalizationLanguageCombobox
            onChange={onDefaultLanguageChange}
            options={languageOptions}
            placeholder="source"
            value={localization.defaultLanguage}
          />
        </div>

        <div style={controlRowStyles}>
          <p style={labelTitleStyles}>Translation engine</p>
          <p style={labelDescriptionStyles}>
            Current engine id used for bundle materialization.
          </p>
          <input
            onChange={(event) => onEngineIdChange(event.target.value)}
            placeholder="google-gtx"
            style={inputStyles}
            type="text"
            value={localization.engineId}
          />
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
              placeholder={localization.defaultLanguage}
              value={localization.categories[category.id]}
            />
          </div>
        ))}

        <div style={controlRowStyles}>
          <p style={labelTitleStyles}>Workflow terms policy</p>
          <p style={labelDescriptionStyles}>
            Choose whether workflow taxonomy should stay in English or
            participate in localization.
          </p>
          <div style={policyGroupStyles}>
            {policyOptions.map((option) => {
              const selected = localization.workflowTermsPolicy === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => onWorkflowTermsPolicyChange(option.id)}
                  style={{
                    ...policyButtonBaseStyles,
                    background: selected
                      ? settingsColorTokens.actionPrimary
                      : policyButtonBaseStyles.background,
                    borderColor: selected
                      ? settingsColorTokens.actionPrimary
                      : settingsColorTokens.borderStrong,
                    color: selected
                      ? settingsColorTokens.actionPrimaryText
                      : settingsColorTokens.textSecondary,
                  }}
                  type="button"
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <p style={helperStyles}>
            {
              policyOptions.find(
                (option) => option.id === localization.workflowTermsPolicy
              )?.description
            }
          </p>
        </div>
      </div>
    </SettingsCard>
  );
};

export default memo(LocalizationSettingsCard);
