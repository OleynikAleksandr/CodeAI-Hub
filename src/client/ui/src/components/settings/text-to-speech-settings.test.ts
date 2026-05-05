import assert from "node:assert/strict";
import test from "node:test";
import { updateTextToSpeechRate } from "./settings-state-helpers";
import {
  createDefaultSettings,
  mapSettingsSnapshot,
} from "./settings-state-model";
import {
  DEFAULT_TEXT_TO_SPEECH_RATE,
  MAX_TEXT_TO_SPEECH_RATE,
  MIN_TEXT_TO_SPEECH_RATE,
  normalizeTextToSpeechRate,
} from "./text-to-speech-settings";

test("mapSettingsSnapshot defaults text-to-speech rate", () => {
  const settings = createDefaultSettings();

  assert.equal(settings.general.textToSpeech.rate, DEFAULT_TEXT_TO_SPEECH_RATE);
});

test("mapSettingsSnapshot clamps persisted text-to-speech rate", () => {
  assert.equal(
    mapSettingsSnapshot({ general: { textToSpeech: { rate: 0.2 } } }).general
      .textToSpeech.rate,
    MIN_TEXT_TO_SPEECH_RATE
  );
  assert.equal(
    mapSettingsSnapshot({ general: { textToSpeech: { rate: 4 } } }).general
      .textToSpeech.rate,
    MAX_TEXT_TO_SPEECH_RATE
  );
});

test("updateTextToSpeechRate persists selected rate in settings state", () => {
  const settings = updateTextToSpeechRate(createDefaultSettings(), 1.35);

  assert.equal(settings.general.textToSpeech.rate, 1.35);
  assert.equal(
    normalizeTextToSpeechRate(Number.NaN),
    DEFAULT_TEXT_TO_SPEECH_RATE
  );
});
