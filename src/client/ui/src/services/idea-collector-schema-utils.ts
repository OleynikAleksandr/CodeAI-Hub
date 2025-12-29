type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const cloneSchema = (schema: JsonRecord): JsonRecord =>
  typeof globalThis.structuredClone === "function"
    ? globalThis.structuredClone(schema)
    : (JSON.parse(JSON.stringify(schema)) as JsonRecord);

const strictifyProperties = (schema: JsonRecord): void => {
  const properties = schema.properties;
  if (!isRecord(properties)) {
    return;
  }
  schema.required = Object.keys(properties);
  if (schema.additionalProperties === undefined) {
    schema.additionalProperties = false;
  }
  for (const value of Object.values(properties)) {
    if (isRecord(value)) {
      strictifySchema(value);
    }
  }
};

const strictifyItems = (schema: JsonRecord): void => {
  const items = schema.items;
  if (Array.isArray(items)) {
    for (const item of items) {
      if (isRecord(item)) {
        strictifySchema(item);
      }
    }
    return;
  }
  if (isRecord(items)) {
    strictifySchema(items);
  }
};

const strictifyCombinators = (schema: JsonRecord): void => {
  for (const key of ["allOf", "anyOf", "oneOf"]) {
    const entries = schema[key];
    if (!Array.isArray(entries)) {
      continue;
    }
    for (const entry of entries) {
      if (isRecord(entry)) {
        strictifySchema(entry);
      }
    }
  }
};

const strictifySchema = (schema: JsonRecord): void => {
  strictifyProperties(schema);
  strictifyItems(schema);
  strictifyCombinators(schema);
};

const injectTemplateIntoSchema = (
  schema: JsonRecord,
  template: string | null
): JsonRecord => {
  if (!template) {
    return schema;
  }
  const properties = schema.properties;
  if (!isRecord(properties)) {
    return schema;
  }
  const artifact = properties.artifact;
  if (!isRecord(artifact)) {
    return schema;
  }
  const artifactProperties = artifact.properties;
  if (!isRecord(artifactProperties)) {
    return schema;
  }
  const ideaMarkdown = artifactProperties.idea_markdown;
  if (!isRecord(ideaMarkdown)) {
    return schema;
  }
  const description =
    typeof ideaMarkdown.description === "string"
      ? ideaMarkdown.description
      : "Idea.md markdown output.";
  ideaMarkdown.description = `${description}\n\nIdea.md template:\n${template}`;
  return schema;
};

export const normalizeIdeaCollectorSchema = (
  schema: JsonRecord,
  template: string | null
): JsonRecord => {
  const next = cloneSchema(schema);
  strictifySchema(next);
  return injectTemplateIntoSchema(next, template);
};
