export interface RawTextToSpeechSettings {
  readonly rate?: unknown;
}

export interface TextToSpeechSettings {
  readonly rate: number;
}

export const DEFAULT_TEXT_TO_SPEECH_RATE = 1;
export const MAX_TEXT_TO_SPEECH_RATE = 2;
export const MIN_TEXT_TO_SPEECH_RATE = 0.75;

export const normalizeTextToSpeechRate = (rate: unknown): number => {
  const numericRate = Number(rate);
  if (!Number.isFinite(numericRate)) {
    return DEFAULT_TEXT_TO_SPEECH_RATE;
  }
  return Math.min(
    MAX_TEXT_TO_SPEECH_RATE,
    Math.max(MIN_TEXT_TO_SPEECH_RATE, numericRate)
  );
};

export const mapTextToSpeechSettings = (
  value: RawTextToSpeechSettings | undefined
): TextToSpeechSettings => ({
  rate: normalizeTextToSpeechRate(value?.rate),
});

export const areTextToSpeechSettingsEqual = (
  left: TextToSpeechSettings,
  right: TextToSpeechSettings
): boolean => left.rate === right.rate;
