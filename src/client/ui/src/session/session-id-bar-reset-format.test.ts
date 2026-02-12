import assert from "node:assert/strict";
import test from "node:test";
import { buildResetLabel } from "./session-id-bar-reset-format";

const WARSAW_OPTIONS = {
  timeZone: "Europe/Warsaw",
  locale: "en-US",
} as const;

test("buildResetLabel formats ISO UTC in local timezone with readable style", () => {
  const label = buildResetLabel("2026-02-12T17:00:00.000Z", WARSAW_OPTIONS);
  assert.equal(label, "Resets Feb 12 at 6pm");
});

test("buildResetLabel supports UTC suffix format used by legacy payloads", () => {
  const label = buildResetLabel("2026-02-15 07:00 (UTC)", WARSAW_OPTIONS);
  assert.equal(label, "Resets Feb 15 at 8am");
});

test("buildResetLabel keeps minutes when they are non-zero", () => {
  const label = buildResetLabel("2026-02-12T17:15:00.000Z", WARSAW_OPTIONS);
  assert.equal(label, "Resets Feb 12 at 6:15pm");
});

test("buildResetLabel keeps fallback for non-date values and strips timezone suffix", () => {
  const label = buildResetLabel("5pm (Europe/Madrid)", WARSAW_OPTIONS);
  assert.equal(label, "Resets 5pm");
});
