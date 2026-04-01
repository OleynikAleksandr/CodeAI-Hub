import type { CSSProperties, FC, FormEvent } from "react";
import { memo, useEffect, useMemo, useState } from "react";
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
  editingIndex: number | null
): string | null => {
  const normalized = normalizeTerm(value);
  if (!normalized) {
    return "Enter an English term to preserve.";
  }
  if (!LATIN_LETTER_PATTERN.test(normalized)) {
    return "Use a term that contains at least one Latin letter.";
  }
  if (normalized.length > MAX_GLOSSARY_TERM_LENGTH) {
    return `Keep glossary terms under ${MAX_GLOSSARY_TERM_LENGTH} characters.`;
  }
  if (RESERVED_SEQUENCE_PATTERN.test(normalized)) {
    return "Reserved marker-like sequences are not allowed in glossary terms.";
  }

  const dedupeKey = normalized.toLowerCase();
  const duplicateIndex = existingTerms.findIndex(
    (term) => normalizeTerm(term).toLowerCase() === dedupeKey
  );
  if (duplicateIndex !== -1 && duplicateIndex !== editingIndex) {
    return "That term is already in the local glossary draft.";
  }

  return null;
};

const LocalizationGlossaryEditor: FC<LocalizationGlossaryEditorProps> = ({
  glossaryEnabled,
}) => {
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

  const statusText = useMemo(
    () =>
      glossaryEnabled
        ? "Glossary protection is enabled. Terms added here stay protected when localization materialization is wired in."
        : "Glossary protection is off. Terms stay in the local draft until you enable glossary protection.",
    [glossaryEnabled]
  );

  const submitLabel = editingIndex === null ? "Add term" : "Save term";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateTerm(draft, terms, editingIndex);
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
        <p style={titleStyles}>Do-not-translate terms</p>
        <p style={bodyStyles}>
          Add English product terms that must stay untouched during
          localization. This first-wave editor keeps a local draft on this
          machine until the dedicated glossary storage stream lands.
        </p>
      </div>

      <p aria-live="polite" style={statusStyles}>
        {statusText}
      </p>

      <form onSubmit={handleSubmit} style={formStyles}>
        <label>
          <span style={bodyStyles}>English term</span>
          <input
            aria-label="English glossary term"
            onChange={(event) => {
              setDraft(event.target.value);
              if (error) {
                setError(null);
              }
            }}
            placeholder="Project Manager"
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
              Cancel edit
            </button>
          )}
        </div>
      </form>

      {error ? <p style={errorStyles}>{error}</p> : null}

      <div style={termListStyles}>
        {terms.length === 0 ? (
          <p style={bodyStyles}>
            No protected terms yet. Typical examples:{" "}
            <code>Project Manager</code>, <code>Artifact Viewer</code>,{" "}
            <code>CODEX_HOME</code>.
          </p>
        ) : (
          terms.map((term, index) => (
            <div key={term} style={termRowStyles}>
              <p style={termTextStyles}>
                <code>{term}</code>
              </p>
              <div style={actionRowStyles}>
                <button
                  aria-label={`Edit glossary term ${term}`}
                  onClick={() => handleEdit(index)}
                  style={secondaryButtonStyles}
                  type="button"
                >
                  Edit
                </button>
                <button
                  aria-label={`Remove glossary term ${term}`}
                  onClick={() => handleRemove(index)}
                  style={secondaryButtonStyles}
                  type="button"
                >
                  Remove
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
