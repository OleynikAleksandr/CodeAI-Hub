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
import { SUPPORTED_LOCALIZATION_ENGINE_IDS } from "./use-settings-state-support";

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

const formatUnknownTranslationEngineLabel = (engineId: string): string =>
  engineId.startsWith("codex-")
    ? `OpenAI Codex · ${engineId.slice("codex-".length)}`
    : engineId;

const resolveTranslationEngineLabel = (
  engineId: string,
  t: ReturnType<typeof useLocalization>["t"]
): string => {
  if (engineId === "codex-gpt-5.4-mini") {
    return t(
      "ui_interface",
      "settings.localization.translation_engine.option.codex_gpt54_mini",
      "OpenAI Codex · GPT-5.4 Mini"
    );
  }
  if (engineId === "codex-gpt-5.3-codex-spark") {
    return t(
      "ui_interface",
      "settings.localization.translation_engine.option.codex_gpt53_spark",
      "OpenAI Codex · GPT-5.3 Codex Spark"
    );
  }
  if (engineId === "google-gtx") {
    return t(
      "ui_interface",
      "settings.localization.translation_engine.option.google_gtx",
      "Google GTX Free"
    );
  }
  if (engineId === "anthropic-claude-haiku-4-5") {
    return t(
      "ui_interface",
      "settings.localization.translation_engine.option.anthropic_claude_haiku_4_5",
      "Anthropic Claude · Haiku 4.5"
    );
  }
  return formatUnknownTranslationEngineLabel(engineId);
};

const LocalizationSettingsCard: FC<LocalizationSettingsCardProps> = ({
  localization,
  onCategoryLanguageChange,
  onEngineIdChange,
  onGlossaryEnabledChange,
}) => {
  const { availableEngines, t } = useLocalization();
  const defaultLanguageLabel = t(
    "ui_interface",
    "settings.localization.default_language.reset_label",
    "Default Language (English)"
  );
  const categoryFields: ReadonlyArray<{
    readonly description: string;
    readonly id: LocalizationCategoryKey;
    readonly label: string;
  }> = [
    {
      id: "uiInterface",
      label: t(
        "ui_interface",
        "settings.localization.category.ui_labels.label",
        "UI Labels"
      ),
      description: t(
        "user_guidance",
        "settings.localization.category.ui_labels.description",
        "Buttons, tabs, section names, step names, and short interface terms."
      ),
    },
    {
      id: "userGuidance",
      label: t(
        "ui_interface",
        "settings.localization.category.ui_helper_text.label",
        "UI Helper Text"
      ),
      description: t(
        "user_guidance",
        "settings.localization.category.ui_helper_text.description",
        "Short interface explanations and helper copy that clarifies labels and settings."
      ),
    },
    {
      id: "systemFeedback",
      label: t(
        "ui_interface",
        "settings.localization.category.messages_for_the_user.label",
        "Messages for the User"
      ),
      description: t(
        "user_guidance",
        "settings.localization.category.messages_for_the_user.description",
        "Warnings, errors, hints, status updates, visible Thinking and Reasoning bubbles, and other messages addressed to the user."
      ),
    },
    {
      id: "interactiveTemplates",
      label: t(
        "ui_interface",
        "settings.localization.category.artifacts_for_the_user.label",
        "Artifacts for the User"
      ),
      description: t(
        "user_guidance",
        "settings.localization.category.artifacts_for_the_user.description",
        "Forms and final user-facing artifacts. Agent instructions and templates stay in English."
      ),
    },
  ];
  const sourceLanguageOption: LocalizationLanguageOption = {
    code: "source",
    label: defaultLanguageLabel,
  };
  const engineOptions =
    availableEngines.length > 0
      ? availableEngines
      : SUPPORTED_LOCALIZATION_ENGINE_IDS.map((engineId) => ({
          engineId,
          languages: [],
        }));
  const selectedEngineOption = engineOptions.find(
    (engine) => engine.engineId === localization.engineId
  );
  const visibleEngineOptions = selectedEngineOption
    ? engineOptions
    : [
        {
          engineId: localization.engineId,
          languages: [],
        },
        ...engineOptions,
      ];
  const activeEngine = selectedEngineOption ?? visibleEngineOptions[0];
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

  const activeEngineId = localization.engineId;

  const engineSelectStyles: CSSProperties = {
    ...inputStyles,
    appearance: "none",
  };

  return (
    <SettingsCard
      title={t("ui_interface", "settings.localization.title", "Localization")}
    >
      <p style={introStyles}>
        {t(
          "user_guidance",
          "settings.localization.intro",
          "Configure which user-facing text should stay in English and which should be localized for the user."
        )}
      </p>
      <p style={helperStyles}>
        {t(
          "user_guidance",
          "settings.localization.category_bridge_helper",
          "`Workflow Terms` now follow `UI Labels`, and `Default Language (English)` is the reset state for every category."
        )}
      </p>

      <div style={controlGridStyles}>
        <div style={controlRowStyles}>
          <p style={labelTitleStyles}>
            {t(
              "ui_interface",
              "settings.localization.translation_engine.label",
              "Translation engine"
            )}
          </p>
          <p style={labelDescriptionStyles}>
            {t(
              "user_guidance",
              "settings.localization.translation_engine.description",
              "Engine used for localization bundle materialization and live translation of user-facing assistant text."
            )}
          </p>
          <select
            onChange={(event) => onEngineIdChange(event.target.value)}
            style={engineSelectStyles}
            value={activeEngineId}
          >
            {visibleEngineOptions.map((engine) => (
              <option key={engine.engineId} value={engine.engineId}>
                {resolveTranslationEngineLabel(engine.engineId, t)}
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
            <p style={labelTitleStyles}>
              {t(
                "ui_interface",
                "settings.localization.glossary_protection.label",
                "Glossary protection"
              )}
            </p>
            <p style={labelDescriptionStyles}>
              {t(
                "user_guidance",
                "settings.localization.glossary_protection.description",
                "Keep protected terms, provider names, and product vocabulary stable during localization."
              )}
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
              placeholder={defaultLanguageLabel}
              value={resolveCategoryValue(localization.categories[category.id])}
            />
          </div>
        ))}
      </div>
    </SettingsCard>
  );
};

export default memo(LocalizationSettingsCard);
