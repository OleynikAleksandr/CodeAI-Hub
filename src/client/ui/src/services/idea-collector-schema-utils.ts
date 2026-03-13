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

const removeCombinatorsFromProperties = (schema: JsonRecord): void => {
  const properties = schema.properties;
  if (!isRecord(properties)) {
    return;
  }
  for (const value of Object.values(properties)) {
    if (isRecord(value)) {
      removeCombinators(value);
    }
  }
};

const removeCombinatorsFromItems = (schema: JsonRecord): void => {
  const items = schema.items;
  if (Array.isArray(items)) {
    for (const item of items) {
      if (isRecord(item)) {
        removeCombinators(item);
      }
    }
    return;
  }
  if (isRecord(items)) {
    removeCombinators(items);
  }
};

const removeCombinators = (schema: JsonRecord): void => {
  removeCombinatorsFromProperties(schema);
  removeCombinatorsFromItems(schema);
  for (const key of ["allOf", "anyOf", "oneOf"]) {
    const entries = schema[key];
    if (!Array.isArray(entries)) {
      continue;
    }
    for (const entry of entries) {
      if (isRecord(entry)) {
        removeCombinators(entry);
      }
    }
    delete schema[key];
  }
};

const strictifySchema = (schema: JsonRecord): void => {
  removeCombinators(schema);
  strictifyProperties(schema);
  strictifyItems(schema);
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
      : "Final_Description.md markdown output.";
  ideaMarkdown.description = `${description}\n\nFinal_Description.md template:\n${template}`;
  return schema;
};

const ALLOWED_SCHEMA_KEYS = new Set([
  "type",
  "properties",
  "required",
  "additionalProperties",
  "items",
  "description",
]);

const pruneSchemaKeys = (schema: JsonRecord): void => {
  for (const key of Object.keys(schema)) {
    if (!ALLOWED_SCHEMA_KEYS.has(key)) {
      delete schema[key];
    }
  }
};

const sanitizeSchemaProperties = (schema: JsonRecord): void => {
  const properties = schema.properties;
  if (!isRecord(properties)) {
    return;
  }
  for (const value of Object.values(properties)) {
    if (isRecord(value)) {
      sanitizeSchemaKeywords(value);
    }
  }
};

const sanitizeSchemaItems = (schema: JsonRecord): void => {
  const items = schema.items;
  if (Array.isArray(items)) {
    for (const item of items) {
      if (isRecord(item)) {
        sanitizeSchemaKeywords(item);
      }
    }
    return;
  }
  if (isRecord(items)) {
    sanitizeSchemaKeywords(items);
  }
};

const sanitizeSchemaKeywords = (schema: JsonRecord): void => {
  pruneSchemaKeys(schema);
  sanitizeSchemaProperties(schema);
  sanitizeSchemaItems(schema);
};

export const normalizeIdeaCollectorSchema = (
  schema: JsonRecord,
  template: string | null
): JsonRecord => {
  const next = cloneSchema(schema);
  strictifySchema(next);
  sanitizeSchemaKeywords(next);
  return injectTemplateIntoSchema(next, template);
};
