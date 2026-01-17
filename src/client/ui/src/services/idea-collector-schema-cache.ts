import {
  loadDescriptionContract,
  loadVirtualSimulationContract,
} from "./idea-collector-contract";

type SchemaKey = "description" | "virtual_simulation";

type SchemaLoader = () => Promise<Record<string, unknown>>;

const cachedSchemas = new Map<SchemaKey, Record<string, unknown>>();
const pendingSchemas = new Map<SchemaKey, Promise<Record<string, unknown>>>();

const loadSchemaCached = (
  key: SchemaKey,
  loader: SchemaLoader
): Promise<Record<string, unknown>> => {
  const cached = cachedSchemas.get(key);
  if (cached) {
    return Promise.resolve(cached);
  }
  const pending = pendingSchemas.get(key);
  if (pending) {
    return pending;
  }

  const next = loader()
    .then((schema) => {
      cachedSchemas.set(key, schema);
      return schema;
    })
    .finally(() => {
      pendingSchemas.delete(key);
    });

  pendingSchemas.set(key, next);
  return next;
};

export const loadDescriptionSchemaCached = (): Promise<
  Record<string, unknown>
> =>
  loadSchemaCached("description", () =>
    loadDescriptionContract().then((contract) => contract.schema)
  );

export const loadVirtualSimulationSchemaCached = (): Promise<
  Record<string, unknown>
> =>
  loadSchemaCached("virtual_simulation", () =>
    loadVirtualSimulationContract().then((contract) => contract.schema)
  );

export const loadIdeaCollectorSchemaCached = (): Promise<
  Record<string, unknown>
> => loadDescriptionSchemaCached();
