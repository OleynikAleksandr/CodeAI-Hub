import type { CSSProperties, FC, FormEvent } from "react";
import { memo, useEffect, useState } from "react";
import { useLocalization } from "../../app-host/use-localization";
import { settingsColorTokens, settingsTypographyTokens } from "./style-tokens";
import { LOCALIZATION_GLOSSARY_DRAFT_STORAGE_KEY } from "./use-settings-state";

interface LocalizationGlossaryEditorProps {
  readonly glossaryEnabled: boolean;
}

interface StoredGlossaryDraft {
  readonly preserve: readonly string[];
}

const MAX_GLOSSARY_TERM_LENGTH = 120;
const LATIN_LETTER_PATTERN = /[A-Za-z]/;
const RESERVED_SEQUENCE_PATTERN = /(?:\[\[|\]\]|\{\{|\}\})/;
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

const formStyles: CSSProperties = {
  display: "grid",
  gap: "10px",
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

const secondaryButtonStyles: CSSProperties = {
  minHeight: "34px",
  padding: "0 12px",
  borderRadius: "999px",
  border: `1px solid ${settingsColorTokens.borderStrong}`,
  background: settingsColorTokens.surface,
  color: settingsColorTokens.textSecondary,
  cursor: "pointer",
  fontSize: settingsTypographyTokens.bodyFontSize,
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

const errorStyles: CSSProperties = {
  color: "#f2b8b5",
  fontSize: settingsTypographyTokens.bodyFontSize,
  lineHeight: 1.5,
  margin: 0,
};

const termListStyles: CSSProperties = {
  display: "grid",
  gap: "8px",
};

const termRowStyles: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  padding: "10px 12px",
  borderRadius: "6px",
  border: `1px solid ${settingsColorTokens.borderSubtle}`,
  background: settingsColorTokens.surface,
};

const termTextStyles: CSSProperties = {
  margin: 0,
  color: settingsColorTokens.textPrimary,
  fontSize: settingsTypographyTokens.bodyFontSize,
  lineHeight: 1.5,
  wordBreak: "break-word",
};

const getLocalStorage = (): Storage | null => {
  try {
    return "localStorage" in globalThis ? globalThis.localStorage : null;
  } catch {
    return null;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeTerm = (value: string): string => value.trim();

const dedupeTerms = (terms: readonly string[]): readonly string[] => {
  const uniqueTerms: string[] = [];
  const seen = new Set<string>();

  for (const candidate of terms) {
    const normalized = normalizeTerm(candidate);
    const dedupeKey = normalized.toLowerCase();
    if (!normalized || seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    uniqueTerms.push(normalized);
  }

  return uniqueTerms;
};

const parseStoredGlossaryDraft = (raw: string): readonly string[] => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return [];
  }

  if (!(isRecord(parsed) && Array.isArray(parsed.preserve))) {
    return [];
  }

  return dedupeTerms(
    parsed.preserve.filter(
      (value): value is string => typeof value === "string"
    )
  );
};

const validateTerm = (
  value: string,
  existingTerms: readonly string[],
  editingIndex: number | null,
  messages: {
    readonly duplicate: string;
    readonly empty: string;
    readonly latinLetter: string;
    readonly reservedSequence: string;
    readonly tooLong: string;
  }
): string | null => {
  const normalized = normalizeTerm(value);
  if (!normalized) {
    return messages.empty;
  }
  if (!LATIN_LETTER_PATTERN.test(normalized)) {
    return messages.latinLetter;
  }
  if (normalized.length > MAX_GLOSSARY_TERM_LENGTH) {
    return messages.tooLong;
  }
  if (RESERVED_SEQUENCE_PATTERN.test(normalized)) {
    return messages.reservedSequence;
  }

  const dedupeKey = normalized.toLowerCase();
  const duplicateIndex = existingTerms.findIndex(
    (term) => normalizeTerm(term).toLowerCase() === dedupeKey
  );
  if (duplicateIndex !== -1 && duplicateIndex !== editingIndex) {
    return messages.duplicate;
  }

  return null;
};

const LocalizationGlossaryEditor: FC<LocalizationGlossaryEditorProps> = ({
  glossaryEnabled,
}) => {
  const { t } = useLocalization();
  const [draft, setDraft] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [terms, setTerms] = useState<readonly string[]>([]);

  useEffect(() => {
    const storage = getLocalStorage();
    if (!storage) {
      return;
    }
    const raw = storage.getItem(LOCALIZATION_GLOSSARY_DRAFT_STORAGE_KEY);
    if (!raw) {
      return;
    }
    setTerms(parseStoredGlossaryDraft(raw));
  }, []);

  useEffect(() => {
    const storage = getLocalStorage();
    if (!storage) {
      return;
    }
    const payload: StoredGlossaryDraft = { preserve: terms };
    try {
      storage.setItem(
        LOCALIZATION_GLOSSARY_DRAFT_STORAGE_KEY,
        JSON.stringify(payload)
      );
    } catch {
      // ignore quota / permission errors
    }
  }, [terms]);

  const title = t(
    UI_LABELS_CATEGORY,
    "settings.localization.do_not_translate_terms.title",
    "Do-not-translate terms"
  );
  const description = t(
    UI_HELPER_TEXT_CATEGORY,
    "settings.localization.do_not_translate_terms.description",
    "Add English product terms that must stay untouched during localization. This first-wave editor keeps a local draft on this machine until the dedicated glossary storage stream lands."
  );
  const inputLabel = t(
    UI_LABELS_CATEGORY,
    "settings.localization.do_not_translate_terms.english_term_label",
    "English term"
  );
  const addTermLabel = t(
    UI_LABELS_CATEGORY,
    "settings.localization.do_not_translate_terms.add_term_label",
    "Add term"
  );
  const saveTermLabel = t(
    UI_LABELS_CATEGORY,
    "settings.localization.do_not_translate_terms.save_term_label",
    "Save term"
  );
  const cancelEditLabel = t(
    UI_LABELS_CATEGORY,
    "settings.localization.do_not_translate_terms.cancel_edit_label",
    "Cancel edit"
  );
  const editTermLabel = t(
    UI_LABELS_CATEGORY,
    "settings.localization.do_not_translate_terms.edit_term_label",
    "Edit"
  );
  const removeTermLabel = t(
    UI_LABELS_CATEGORY,
    "settings.localization.do_not_translate_terms.remove_term_label",
    "Remove"
  );
  const inputPlaceholder = t(
    UI_HELPER_TEXT_CATEGORY,
    "settings.localization.do_not_translate_terms.placeholder",
    "Project Manager"
  );
  const statusText = glossaryEnabled
    ? t(
        UI_HELPER_TEXT_CATEGORY,
        "settings.localization.do_not_translate_terms.enabled_status",
        "Glossary protection is enabled. Terms added here stay protected when localization materialization is wired in."
      )
    : t(
        UI_HELPER_TEXT_CATEGORY,
        "settings.localization.do_not_translate_terms.disabled_status",
        "Glossary protection is off. Terms stay in the local draft until you enable glossary protection."
      );
  const emptyStateIntro = t(
    UI_HELPER_TEXT_CATEGORY,
    "settings.localization.do_not_translate_terms.empty_state_intro",
    "No protected terms yet. Typical examples:"
  );
  const validationMessages = {
    duplicate: t(
      UI_HELPER_TEXT_CATEGORY,
      "settings.localization.do_not_translate_terms.validation.duplicate",
      "That term is already in the local glossary draft."
    ),
    empty: t(
      UI_HELPER_TEXT_CATEGORY,
      "settings.localization.do_not_translate_terms.validation.empty",
      "Enter an English term to preserve."
    ),
    latinLetter: t(
      UI_HELPER_TEXT_CATEGORY,
      "settings.localization.do_not_translate_terms.validation.latin_letter",
      "Use a term that contains at least one Latin letter."
    ),
    reservedSequence: t(
      UI_HELPER_TEXT_CATEGORY,
      "settings.localization.do_not_translate_terms.validation.reserved_sequence",
      "Reserved marker-like sequences are not allowed in glossary terms."
    ),
    tooLong: t(
      UI_HELPER_TEXT_CATEGORY,
      "settings.localization.do_not_translate_terms.validation.too_long",
      `Keep glossary terms under ${MAX_GLOSSARY_TERM_LENGTH} characters.`,
      { maxLength: MAX_GLOSSARY_TERM_LENGTH }
    ),
  } as const;

  const submitLabel = editingIndex === null ? addTermLabel : saveTermLabel;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateTerm(
      draft,
      terms,
      editingIndex,
      validationMessages
    );
    if (validationError) {
      setError(validationError);
      return;
    }

    const normalized = normalizeTerm(draft);
    setTerms((previousTerms) => {
      if (editingIndex === null) {
        return [...previousTerms, normalized];
      }
      return previousTerms.map((term, index) =>
        index === editingIndex ? normalized : term
      );
    });
    setDraft("");
    setEditingIndex(null);
    setError(null);
  };

  const handleEdit = (index: number) => {
    setDraft(terms[index] ?? "");
    setEditingIndex(index);
    setError(null);
  };

  const handleRemove = (index: number) => {
    setTerms((previousTerms) =>
      previousTerms.filter((_, termIndex) => termIndex !== index)
    );
    if (editingIndex === index) {
      setDraft("");
      setEditingIndex(null);
      setError(null);
      return;
    }
    if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
  };

  const handleCancel = () => {
    setDraft("");
    setEditingIndex(null);
    setError(null);
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

      <form onSubmit={handleSubmit} style={formStyles}>
        <label>
          <span style={bodyStyles}>{inputLabel}</span>
          <input
            aria-label={inputLabel}
            onChange={(event) => {
              setDraft(event.target.value);
              if (error) {
                setError(null);
              }
            }}
            placeholder={inputPlaceholder}
            style={inputStyles}
            type="text"
            value={draft}
          />
        </label>
        <div style={actionRowStyles}>
          <button style={primaryButtonStyles} type="submit">
            {submitLabel}
          </button>
          {editingIndex === null ? null : (
            <button
              onClick={handleCancel}
              style={secondaryButtonStyles}
              type="button"
            >
              {cancelEditLabel}
            </button>
          )}
        </div>
      </form>

      {error ? <p style={errorStyles}>{error}</p> : null}

      <div style={termListStyles}>
        {terms.length === 0 ? (
          <p style={bodyStyles}>
            {emptyStateIntro} <code>Project Manager</code>,{" "}
            <code>Artifact Viewer</code>, <code>CODEX_HOME</code>.
          </p>
        ) : (
          terms.map((term, index) => (
            <div key={term} style={termRowStyles}>
              <p style={termTextStyles}>
                <code>{term}</code>
              </p>
              <div style={actionRowStyles}>
                <button
                  aria-label={`${editTermLabel}: ${term}`}
                  onClick={() => handleEdit(index)}
                  style={secondaryButtonStyles}
                  type="button"
                >
                  {editTermLabel}
                </button>
                <button
                  aria-label={`${removeTermLabel}: ${term}`}
                  onClick={() => handleRemove(index)}
                  style={secondaryButtonStyles}
                  type="button"
                >
                  {removeTermLabel}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default memo(LocalizationGlossaryEditor);
