import type { TranslationEngine } from "./translation-engine";

export class TranslationEngineRegistry {
  private readonly engines = new Map<string, TranslationEngine>();
  private readonly defaultEngineId?: string;

  constructor(
    engines: readonly TranslationEngine[] = [],
    defaultEngineId?: string
  ) {
    this.defaultEngineId = defaultEngineId;
    for (const engine of engines) {
      this.register(engine);
    }
  }

  register(engine: TranslationEngine): void {
    this.engines.set(engine.id, engine);
  }

  resolve(engineId?: string): TranslationEngine | null {
    if (engineId) {
      const explicit = this.engines.get(engineId);
      if (explicit) {
        return explicit;
      }
    }

    if (this.defaultEngineId) {
      return this.engines.get(this.defaultEngineId) ?? null;
    }

    const first = this.engines.values().next().value as
      | TranslationEngine
      | undefined;
    return first ?? null;
  }
}
