const FINALIZE_TRIGGER_PATTERN =
  /(^|[\s,.;:!?])(?:ок|ok|утверждаю|approve|approved)(?=$|[\s,.;:!?])/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const cloneSchema = (
  schema: Record<string, unknown>
): Record<string, unknown> =>
  typeof globalThis.structuredClone === "function"
    ? (globalThis.structuredClone(schema) as Record<string, unknown>)
    : (JSON.parse(JSON.stringify(schema)) as Record<string, unknown>);

const enforceArtifactsRequired = (
  schema: Record<string, unknown>
): Record<string, unknown> => {
  const next = cloneSchema(schema);
  const properties = next.properties;
  if (isRecord(properties)) {
    const artifacts = properties.artifacts;
    if (isRecord(artifacts)) {
      artifacts.minItems = 1;
    }
    const questions = properties.questions;
    if (isRecord(questions)) {
      questions.maxItems = 0;
    }
  }
  return next;
};

const isFinalizeTrigger = (content: string): boolean => {
  const normalized = content.trim().replace(/[\\/]/g, " ");
  if (!normalized) {
    return false;
  }
  return FINALIZE_TRIGGER_PATTERN.test(normalized);
};

export { enforceArtifactsRequired, isFinalizeTrigger };
