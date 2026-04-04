import type { CSSProperties, FC } from "react";
import { memo, useEffect } from "react";
import { useLocalization } from "../../app-host/use-localization";
import vscode from "../../vscode";
import { settingsColorTokens, settingsTypographyTokens } from "./style-tokens";
import { LOCALIZATION_GLOSSARY_DRAFT_STORAGE_KEY } from "./use-settings-state";

interface LocalizationGlossaryEditorProps {
  readonly glossaryEnabled: boolean;
}

const UI_LABELS_CATEGORY = "ui_interface";
const UI_HELPER_TEXT_CATEGORY = "user_guidance";

const panelStyles: CSSProperties = {
  display: "grid",
  gap: "12px",
  padding: "12px",
  borderRadius: "8px",
  border: `1px solid ${settingsColorTokens.borderSubtle}`,
  background: "rgba(255, 255, 255, 0.02)",
};

const titleStyles: CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: settingsColorTokens.textPrimary,
  margin: 0,
};

const bodyStyles: CSSProperties = {
  fontSize: settingsTypographyTokens.bodyFontSize,
  color: settingsColorTokens.textMuted,
  lineHeight: 1.5,
  margin: 0,
};

const actionRowStyles: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const primaryButtonStyles: CSSProperties = {
  minHeight: "34px",
  padding: "0 12px",
  borderRadius: "999px",
  border: `1px solid ${settingsColorTokens.actionPrimary}`,
  background: settingsColorTokens.actionPrimary,
  color: settingsColorTokens.actionPrimaryText,
  cursor: "pointer",
  fontSize: settingsTypographyTokens.bodyFontSize,
  fontWeight: 600,
};

const statusStyles: CSSProperties = {
  padding: "8px 10px",
  borderRadius: "6px",
  border: `1px solid ${settingsColorTokens.borderSubtle}`,
  background: "rgba(255, 255, 255, 0.03)",
  color: settingsColorTokens.textSecondary,
  fontSize: settingsTypographyTokens.bodyFontSize,
  lineHeight: 1.5,
};

const getLocalStorage = (): Storage | null => {
  try {
    return "localStorage" in globalThis ? globalThis.localStorage : null;
  } catch {
    return null;
  }
};

const clearLegacyDraft = (): void => {
  const storage = getLocalStorage();
  storage?.removeItem(LOCALIZATION_GLOSSARY_DRAFT_STORAGE_KEY);
};

const LocalizationGlossaryEditor: FC<LocalizationGlossaryEditorProps> = ({
  glossaryEnabled,
}) => {
  const { t } = useLocalization();

  useEffect(() => {
    clearLegacyDraft();
  }, []);

  const title = t(
    UI_LABELS_CATEGORY,
    "settings.localization.do_not_translate_terms.title",
    "Do-not-translate terms"
  );
  const openGlossaryLabel = t(
    UI_LABELS_CATEGORY,
    "settings.localization.do_not_translate_terms.add_term_label",
    "Open glossary file"
  );
  const description = t(
    UI_HELPER_TEXT_CATEGORY,
    "settings.localization.do_not_translate_terms.description",
    "Open the glossary file in VS Code and edit one English term per line. The file is created automatically on first open and starts with common product and workflow terms."
  );
  const statusText = glossaryEnabled
    ? t(
        UI_HELPER_TEXT_CATEGORY,
        "settings.localization.do_not_translate_terms.enabled_status",
        "Glossary protection is enabled. Terms from the glossary file stay protected during localization."
      )
    : t(
        UI_HELPER_TEXT_CATEGORY,
        "settings.localization.do_not_translate_terms.disabled_status",
        "Glossary protection is off. You can still edit the glossary file now; the terms start applying after you enable glossary protection."
      );
  const seededExamplesIntro = t(
    UI_HELPER_TEXT_CATEGORY,
    "settings.localization.do_not_translate_terms.empty_state_intro",
    "The file is prefilled with common terms such as:"
  );

  const handleOpenGlossaryFile = () => {
    clearLegacyDraft();
    vscode.postMessage({
      type: "settings:open-user-glossary-file",
    });
  };

  return (
    <div style={panelStyles}>
      <div>
        <p style={titleStyles}>{title}</p>
        <p style={bodyStyles}>{description}</p>
      </div>

      <p aria-live="polite" style={statusStyles}>
        {statusText}
      </p>

      <div style={actionRowStyles}>
        <button
          onClick={handleOpenGlossaryFile}
          style={primaryButtonStyles}
          type="button"
        >
          {openGlossaryLabel}
        </button>
      </div>

      <p style={bodyStyles}>
        {seededExamplesIntro} <code>Project Manager</code>,{" "}
        <code>Description</code>, <code>CODEX_HOME</code>,{" "}
        <code>questionnaire.md</code>.
      </p>
    </div>
  );
};

export default memo(LocalizationGlossaryEditor);
