const AGENT_QNA_FIELD_ID = "system.agent_qna";
const AGENT_QNA_SECTION_TITLE =
  "## 20. Вопросы AI Агента (пользователем НЕ заполняются!!!)";
const LEGACY_CLARIFICATIONS_HEADER = "## Уточнения анкеты";

const formatClarificationEntry = (
  question: string | null,
  answer: string
): string | null => {
  const normalizedAnswer = answer.trim();
  if (normalizedAnswer.length === 0) {
    return null;
  }
  const normalizedQuestion = question?.trim();
  const questionLine = normalizedQuestion
    ? `- Вопрос: ${normalizedQuestion}`
    : "- Вопрос: (не удалось определить)";
  return `${questionLine}\n  Ответ: ${normalizedAnswer}`.trimEnd();
};

const ensureAgentQnaSection = (content: string): string => {
  if (content.includes(`<!-- field:${AGENT_QNA_FIELD_ID} -->`)) {
    return content;
  }
  return `${content.trimEnd()}\n\n---\n\n${AGENT_QNA_SECTION_TITLE}\n\n<!-- field:${AGENT_QNA_FIELD_ID} -->\n\n<!-- /field -->\n`;
};

export const migrateLegacyClarifications = (content: string): string => {
  if (content.includes(`<!-- field:${AGENT_QNA_FIELD_ID} -->`)) {
    return content;
  }

  const legacyIndex = content.indexOf(LEGACY_CLARIFICATIONS_HEADER);
  if (legacyIndex < 0) {
    return content;
  }

  const before = content.slice(0, legacyIndex).trimEnd();
  const afterHeader = content.slice(legacyIndex);
  const headerLineEnd = afterHeader.indexOf("\n");
  const body =
    headerLineEnd >= 0 ? afterHeader.slice(headerLineEnd + 1).trim() : "";

  const migrated = ensureAgentQnaSection(before);
  const escapedFieldId = AGENT_QNA_FIELD_ID.replace(".", "\\.");
  const fieldRe = new RegExp(
    `<!--\\s*field:${escapedFieldId}\\s*-->\\n([\\s\\S]*?)\\n<!--\\s*\\/field\\s*-->`,
    "u"
  );
  return migrated.replace(fieldRe, (_match, existingRaw: string) => {
    const existing = String(existingRaw ?? "").trim();
    const next = body.length > 0 ? body : existing;
    return `<!-- field:${AGENT_QNA_FIELD_ID} -->\n${next}\n<!-- /field -->`;
  });
};

export const appendClarificationToAgentQnaField = (
  content: string,
  question: string | null,
  answer: string
): string => {
  const entry = formatClarificationEntry(question, answer);
  if (!entry) {
    return content;
  }

  const migrated = migrateLegacyClarifications(content);
  const ensured = ensureAgentQnaSection(migrated);

  const escapedFieldId = AGENT_QNA_FIELD_ID.replace(".", "\\.");
  const fieldRe = new RegExp(
    `<!--\\s*field:${escapedFieldId}\\s*-->\\n([\\s\\S]*?)\\n<!--\\s*\\/field\\s*-->`,
    "u"
  );
  const match = fieldRe.exec(ensured);
  if (!match) {
    return content;
  }

  const existingRaw = match[1] ?? "";
  const existing = String(existingRaw).trim();
  const updatedBody = existing.length > 0 ? `${existing}\n\n${entry}` : entry;
  return ensured.replace(
    fieldRe,
    `<!-- field:${AGENT_QNA_FIELD_ID} -->\n${updatedBody}\n<!-- /field -->`
  );
};
