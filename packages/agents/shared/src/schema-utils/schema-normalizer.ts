import type { JsonRecord } from "../types";
import { cloneSchema, isRecord, strictifySchema } from "./schema-strictifier";

/**
 * Allowed JSON Schema keywords for agent contracts.
 * Other keywords are pruned during normalization.
 */
const ALLOWED_SCHEMA_KEYS = new Set([
  "type",
  "properties",
  "required",
  "additionalProperties",
  "items",
  "description",
]);

/**
 * Normalize a JSON schema for agent use.
 * - Clones the schema to avoid mutation
 * - Strictifies (adds required, additionalProperties: false)
 * - Removes unsupported keywords
 */
export const normalizeSchema = (schema: JsonRecord): JsonRecord => {
  const next = cloneSchema(schema);
  strictifySchema(next);
  sanitizeSchemaKeywords(next);
  return next;
};

/**
 * Inject template content into schema description.
 * Used to embed artifact templates into schema for LLM context.
 */
export const injectTemplateIntoSchema = (
  schema: JsonRecord,
  templatePath: string[],
  template: string
): JsonRecord => {
  let current: unknown = schema;
  for (const key of templatePath) {
    if (!isRecord(current)) {
      return schema;
    }
    const properties = (current as JsonRecord).properties;
    if (!isRecord(properties)) {
      return schema;
    }
    current = properties[key];
  }
  if (!isRecord(current)) {
    return schema;
  }
  const description =
    typeof (current as JsonRecord).description === "string"
      ? (current as JsonRecord).description
      : "Artifact template.";
  (current as JsonRecord).description =
    `${description}\n\nTemplate:\n${template}`;
  return schema;
};

const sanitizeSchemaKeywords = (schema: JsonRecord): void => {
  pruneSchemaKeys(schema);
  sanitizeSchemaProperties(schema);
  sanitizeSchemaItems(schema);
};

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
