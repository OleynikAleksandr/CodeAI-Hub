import {
  isRecord,
  normalizeSchema,
} from "../../../../../packages/agents/shared/src/schema-utils";

type JsonRecord = Record<string, unknown>;

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

export const normalizeIdeaCollectorSchema = (
  schema: JsonRecord,
  template: string | null
): JsonRecord => {
  const next = normalizeSchema(schema);
  return injectTemplateIntoSchema(next, template);
};
