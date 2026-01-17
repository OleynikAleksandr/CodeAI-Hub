import { loadIdeaContract } from "./idea-collector-contract";

let cachedSchema: Record<string, unknown> | null = null;
let pendingSchema: Promise<Record<string, unknown>> | null = null;

export const loadIdeaCollectorSchemaCached = (): Promise<
  Record<string, unknown>
> => {
  if (cachedSchema) {
    return Promise.resolve(cachedSchema);
  }
  if (pendingSchema) {
    return pendingSchema;
  }

  pendingSchema = loadIdeaContract()
    .then((contract) => {
      cachedSchema = contract.schema;
      return contract.schema;
    })
    .finally(() => {
      pendingSchema = null;
    });

  return pendingSchema;
};
