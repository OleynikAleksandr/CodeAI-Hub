interface QuestionnaireField {
  readonly description?: string;
  readonly hint?: string;
  readonly id: string;
  readonly title: string;
  readonly titleHint?: string;
}

interface FieldMeta {
  readonly description?: string;
  readonly title: string;
  readonly titleHint?: string;
}

export const FIELD_REGEX =
  /<!--\s*field:([^\s]+)\s*-->([\s\S]*?)<!--\s*\/field\s*-->/g;

const HEADING_PREFIX_RE = /^#+\s*/;
const HEADING_LINE_RE = /^#+\s+.*$/gm;
const SINGLE_HINT_TOKEN_RE = /^<[^>\n]{1,80}>$/;
const TITLE_HINT_HTML_LINE_RE =
  /^<small>\s*<i>(?<hint>[\s\S]+?)<\/i>\s*<\/small>$/i;

const normalizeDescription = (value: string): string | undefined => {
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("<!--"));
  if (lines.length === 0) {
    return;
  }
  return lines.join("\n");
};

const extractTitleHintFromDescription = (
  descriptionRaw: string
): { readonly titleHint?: string; readonly description?: string } => {
  const lines = descriptionRaw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("<!--"));

  if (lines.length === 0) {
    return {};
  }

  const firstLine = lines[0] ?? "";
  const hintMatch = TITLE_HINT_HTML_LINE_RE.exec(firstLine);
  if (!hintMatch?.groups?.hint) {
    return { description: lines.join("\n") };
  }

  const titleHint = hintMatch.groups.hint.trim();
  const remainder = lines.slice(1).join("\n");
  const description = remainder.length > 0 ? remainder : undefined;

  return { titleHint, description };
};

const resolveFieldMeta = (
  template: string,
  startIndex: number,
  fallback: string
): FieldMeta => {
  const prefix = template.slice(0, startIndex);
  const headings = Array.from(prefix.matchAll(HEADING_LINE_RE));
  const lastHeading = headings.at(-1);
  if (!lastHeading) {
    return { title: fallback };
  }
  const headingIndex = lastHeading.index ?? 0;
  const headingLine = lastHeading[0] ?? "";
  const title = headingLine.replace(HEADING_PREFIX_RE, "").trim() || fallback;
  const descriptionStart = headingIndex + headingLine.length;
  const rawDescription = template.slice(descriptionStart, startIndex);
  const extracted = extractTitleHintFromDescription(rawDescription);
  const description = extracted.description
    ? normalizeDescription(extracted.description)
    : undefined;
  return { title, titleHint: extracted.titleHint, description };
};

const isHintLikeAnswer = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return true;
  }

  if (trimmed.startsWith("Пример:") || trimmed.startsWith("Example:")) {
    return true;
  }

  if (SINGLE_HINT_TOKEN_RE.test(trimmed)) {
    return true;
  }

  const nonEmptyLines = trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (
    nonEmptyLines.length > 0 &&
    nonEmptyLines.every((line) => line.startsWith("- <"))
  ) {
    return true;
  }

  return false;
};

export const parseIdeaQuestionnaireTemplateFields = (
  template: string
): {
  readonly questions: QuestionnaireField[];
  readonly placeholders: Record<string, string>;
} => {
  const isUserEditableFieldId = (fieldId: string): boolean =>
    !fieldId.startsWith("system.");

  const questions: QuestionnaireField[] = [];
  const placeholders: Record<string, string> = {};
  const matches = template.matchAll(FIELD_REGEX);
  for (const match of matches) {
    const fieldId = match[1];
    if (!fieldId || placeholders[fieldId]) {
      continue;
    }
    const placeholder = (match[2] ?? "").trim();
    const { title, titleHint, description } = resolveFieldMeta(
      template,
      match.index ?? 0,
      fieldId
    );
    placeholders[fieldId] = placeholder;
    if (isUserEditableFieldId(fieldId)) {
      questions.push({
        id: fieldId,
        title,
        titleHint,
        description,
      });
    }
  }
  return { questions, placeholders };
};

export const extractIdeaQuestionnaireAnswers = (
  content: string,
  placeholders: Record<string, string>
): Record<string, string> => {
  const answers: Record<string, string> = {};
  const matches = content.matchAll(FIELD_REGEX);
  for (const match of matches) {
    const fieldId = match[1];
    if (!fieldId) {
      continue;
    }
    const candidate = (match[2] ?? "").trim();
    const placeholder = (placeholders[fieldId] ?? "").trim();
    const shouldClear =
      isHintLikeAnswer(candidate) ||
      (candidate === placeholder && isHintLikeAnswer(placeholder));
    answers[fieldId] = shouldClear ? "" : candidate;
  }
  return answers;
};

export const renderIdeaQuestionnaire = (
  template: string,
  placeholders: Record<string, string>,
  answers: Record<string, string>
): string =>
  template.replace(FIELD_REGEX, (_match, fieldId, fallback) => {
    const rawAnswer = answers[fieldId] ?? "";
    const trimmedAnswer = rawAnswer.trim();
    const placeholder = placeholders[fieldId] ?? String(fallback ?? "").trim();
    const replacement =
      trimmedAnswer.length > 0 ? rawAnswer.trimEnd() : placeholder;
    return `<!-- field:${fieldId} -->\n${replacement}\n<!-- /field -->`;
  });
