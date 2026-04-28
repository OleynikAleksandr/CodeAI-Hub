import type {
  CreateSessionModelBindingOptions,
  SessionModelBinding,
  SessionModelBindingKey,
  SessionModelBindingLookup,
  UpdateSessionModelBindingOptions,
} from "./session-model-binding-types";

const KEY_SEPARATOR = "\u001f";

const normalizeOptionalKeyPart = (
  value: string | null | undefined
): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const firstPresent = (
  ...values: ReadonlyArray<string | null | undefined>
): string | null => {
  for (const value of values) {
    const normalized = normalizeOptionalKeyPart(value);
    if (normalized) {
      return normalized;
    }
  }
  return null;
};

const buildLogicalSessionKey = (key: SessionModelBindingKey): string => {
  const stableSessionId = firstPresent(
    key.dialogId,
    key.continuityRootId,
    key.sessionId
  );
  if (stableSessionId) {
    return ["session", stableSessionId].join(KEY_SEPARATOR);
  }

  return [
    "logical",
    normalizeOptionalKeyPart(key.workspaceSlug) ?? "",
    normalizeOptionalKeyPart(key.workspacePath) ?? "",
    normalizeOptionalKeyPart(key.stage) ?? "",
    normalizeOptionalKeyPart(key.runSlug) ?? "",
    normalizeOptionalKeyPart(key.initiativeSlug) ?? "",
  ].join(KEY_SEPARATOR);
};

export const buildSessionModelBindingKey = (
  key: SessionModelBindingKey
): string =>
  [
    "provider",
    normalizeOptionalKeyPart(key.providerId) ?? "unknown",
    buildLogicalSessionKey(key),
  ].join(KEY_SEPARATOR);

export class SessionModelBindingFacade {
  readonly #bindingsByKey = new Map<string, SessionModelBinding>();
  readonly #clock: () => string;

  constructor(options?: { readonly clock?: () => string }) {
    this.#clock = options?.clock ?? (() => new Date().toISOString());
  }

  createBinding(
    options: CreateSessionModelBindingOptions
  ): SessionModelBinding {
    const key = buildSessionModelBindingKey(options);
    const timestamp = this.#clock();
    const binding: SessionModelBinding = {
      key,
      providerId: options.providerId,
      baseModelId: options.baseModelId,
      modelId: options.modelId,
      reasoningEffort: options.reasoningEffort,
      thinkingEnabled: options.thinkingEnabled,
      thinkingLevel: options.thinkingLevel,
      source: options.source,
      boundAt: timestamp,
      updatedAt: timestamp,
    };
    this.#bindingsByKey.set(key, binding);
    return binding;
  }

  getBinding(options: SessionModelBindingLookup): SessionModelBinding | null {
    return (
      this.#bindingsByKey.get(buildSessionModelBindingKey(options)) ?? null
    );
  }

  listBindings(): SessionModelBinding[] {
    return Array.from(this.#bindingsByKey.values());
  }

  removeBinding(options: SessionModelBindingLookup): boolean {
    return this.#bindingsByKey.delete(buildSessionModelBindingKey(options));
  }

  updateBinding(
    options: UpdateSessionModelBindingOptions
  ): SessionModelBinding {
    const key = buildSessionModelBindingKey(options);
    const previous = this.#bindingsByKey.get(key);
    const timestamp = this.#clock();
    const binding: SessionModelBinding = {
      key,
      providerId: options.providerId,
      baseModelId: options.baseModelId,
      modelId: options.modelId,
      reasoningEffort: options.reasoningEffort,
      thinkingEnabled: options.thinkingEnabled,
      thinkingLevel: options.thinkingLevel,
      source: options.source,
      boundAt: previous?.boundAt ?? timestamp,
      updatedAt: timestamp,
    };
    this.#bindingsByKey.set(key, binding);
    return binding;
  }
}
