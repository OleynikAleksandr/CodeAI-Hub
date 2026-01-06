import type { JsonRecord } from "../types";

/**
 * Check if a value is a plain object (not array, not null).
 */
export const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Deep clone a JSON schema object.
 */
export const cloneSchema = (schema: JsonRecord): JsonRecord =>
  JSON.parse(JSON.stringify(schema)) as JsonRecord;

/**
 * Make schema strict by adding required arrays and additionalProperties: false.
 * Recursively processes nested properties and items.
 */
export const strictifySchema = (schema: JsonRecord): void => {
  removeCombinators(schema);
  strictifyProperties(schema);
  strictifyItems(schema);
};

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
