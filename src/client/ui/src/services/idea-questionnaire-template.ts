type QuestionnaireField = {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly hint?: string;
};

type FieldMeta = { readonly title: string; readonly description?: string };

export const FIELD_REGEX =
  /<!--\s*field:([^\s]+)\s*-->([\s\S]*?)<!--\s*\/field\s*-->/g;

const HEADING_PREFIX_RE = /^#+\s*/;
const HEADING_LINE_RE = /^#+\s+.*$/gm;
const HINT_TOKEN_RE = /<[^>\n]{1,80}>/;

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
  const description = normalizeDescription(
    template.slice(descriptionStart, startIndex)
  );
  return { title, description };
};

const isHintLikeAnswer = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return true;
  }

  if (trimmed.startsWith("Пример:") || trimmed.startsWith("Example:")) {
    return true;
  }

  if (HINT_TOKEN_RE.test(trimmed)) {
    return true;
  }

  if (trimmed.split("\n").some((line) => line.trim().startsWith("- <"))) {
    return true;
  }

  if (trimmed.includes("...") && trimmed.includes(":")) {
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
  const questions: QuestionnaireField[] = [];
  const placeholders: Record<string, string> = {};
  const matches = template.matchAll(FIELD_REGEX);
  for (const match of matches) {
    const fieldId = match[1];
    if (!fieldId || placeholders[fieldId]) {
      continue;
    }
    const placeholder = (match[2] ?? "").trim();
    const { title, description } = resolveFieldMeta(
      template,
      match.index ?? 0,
      fieldId
    );
    placeholders[fieldId] = placeholder;
    questions.push({
      id: fieldId,
      title,
      description,
      hint: placeholder.length > 0 ? placeholder : undefined,
    });
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
    answers[fieldId] =
      candidate === placeholder || isHintLikeAnswer(candidate) ? "" : candidate;
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
