export type GlossaryValidationIssueCode =
  | "empty"
  | "missing_latin"
  | "reserved_sequence"
  | "too_long";

export interface GlossaryValidationIssue {
  readonly code: GlossaryValidationIssueCode;
  readonly message: string;
  readonly term: string;
}

export interface GlossaryValidationResult {
  readonly issues: readonly GlossaryValidationIssue[];
  readonly preserve: readonly string[];
}

const MAX_GLOSSARY_TERM_LENGTH = 120;
const LATIN_LETTER_PATTERN = /[A-Za-z]/;
const RESERVED_SEQUENCE_PATTERN = /(?:\[\[|\]\]|\{\{|\}\})/;

export class GlossaryValidator {
  validatePreserveTerms(terms: readonly string[]): GlossaryValidationResult {
    const issues: GlossaryValidationIssue[] = [];
    const preserve: string[] = [];
    const seen = new Set<string>();

    for (const rawTerm of terms) {
      const term = rawTerm.trim();
      if (!term) {
        issues.push({
          code: "empty",
          message: "Glossary term must not be empty.",
          term: rawTerm,
        });
        continue;
      }
      if (!LATIN_LETTER_PATTERN.test(term)) {
        issues.push({
          code: "missing_latin",
          message: "Glossary term must contain at least one Latin letter.",
          term,
        });
        continue;
      }
      if (term.length > MAX_GLOSSARY_TERM_LENGTH) {
        issues.push({
          code: "too_long",
          message: `Glossary term must stay under ${MAX_GLOSSARY_TERM_LENGTH} characters.`,
          term,
        });
        continue;
      }
      if (RESERVED_SEQUENCE_PATTERN.test(term)) {
        issues.push({
          code: "reserved_sequence",
          message: "Glossary term contains marker-reserved sequences.",
          term,
        });
        continue;
      }

      const normalizedKey = term.toLowerCase();
      if (seen.has(normalizedKey)) {
        continue;
      }

      seen.add(normalizedKey);
      preserve.push(term);
    }

    return {
      preserve,
      issues,
    };
  }
}
