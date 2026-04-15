import type {
  TranslationChunkingMode,
  TranslationChunkPolicy,
  TranslationEngineProfile,
} from "./translation-contract";

const DEFAULT_TRANSLATION_ENGINE_ID = "google-gtx";

const DEFAULT_TRANSLATION_ENGINE_PROFILES: readonly TranslationEngineProfile[] =
  [
    {
      chunkPolicy: {
        hardCharacterLimit: 520,
        mode: "auto",
        softCharacterLimit: 360,
      },
      engineId: "google-gtx",
    },
    {
      chunkPolicy: {
        hardCharacterLimit: 380,
        mode: "auto",
        softCharacterLimit: 260,
      },
      engineId: "codex-gpt-5.4-mini",
    },
    {
      chunkPolicy: {
        hardCharacterLimit: 260,
        mode: "auto",
        softCharacterLimit: 180,
      },
      engineId: "codex-gpt-5.3-codex-spark",
    },
    {
      chunkPolicy: {
        hardCharacterLimit: 600,
        mode: "auto",
        softCharacterLimit: 400,
      },
      engineId: "anthropic-claude-haiku-4-5",
    },
  ] as const;

const cloneChunkPolicy = (
  policy: TranslationChunkPolicy,
  mode: TranslationChunkingMode
): TranslationChunkPolicy => ({
  ...policy,
  mode,
});

export class TranslationEngineProfileRegistry {
  private readonly defaultEngineId: string;
  private readonly profiles: ReadonlyMap<string, TranslationEngineProfile>;

  constructor(
    profiles: readonly TranslationEngineProfile[] = DEFAULT_TRANSLATION_ENGINE_PROFILES,
    defaultEngineId = DEFAULT_TRANSLATION_ENGINE_ID
  ) {
    this.defaultEngineId = defaultEngineId;
    this.profiles = new Map(
      profiles.map((profile) => [profile.engineId, profile] as const)
    );
  }

  resolveChunkPolicy(
    engineId: string,
    mode: TranslationChunkingMode = "auto"
  ): TranslationChunkPolicy {
    return cloneChunkPolicy(this.resolveProfile(engineId).chunkPolicy, mode);
  }

  private resolveProfile(engineId: string): TranslationEngineProfile {
    return (
      this.profiles.get(engineId) ??
      this.profiles.get(this.defaultEngineId) ??
      DEFAULT_TRANSLATION_ENGINE_PROFILES[0]
    );
  }
}
