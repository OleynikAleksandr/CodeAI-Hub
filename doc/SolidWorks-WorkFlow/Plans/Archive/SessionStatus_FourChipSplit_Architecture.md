# Session Status Panel — Four-Chip Split Architecture

**Scope:** UI-only refactor of the status row directly under `InputPanel` in PM / shared session view. Today it is one `.session-panel` line ("Models: <name> (<reasoning>) | Tokens: <used> (<remaining>%)"). It must be split into 4 visually independent chips while preserving every information bit it carries today.

**Status:** Planning, awaiting user approval.

**Related prototype:** `doc/tmp/prototypes/session-input-status-split.html` (approved).

---

## 1) Goal

Render the row as 4 chips, left-to-right:

1. **Label chip** — static `Модель:` text in the muted hint color.
2. **Model name chip** — provider-tinted button shape, no click handler in this MVP. Text = `model.modelDisplayName`.
3. **Reasoning chip** — same provider-tinted button shape, no click handler. Text = `model.reasoning` (e.g. `(high)`, `(xhigh)`, `(thinking off)`). Hidden if `model.reasoning` is `undefined`.
4. **Tokens chip** — same shell as today's `.session-id-bar` (so future per-session percent rotation can land on the right edge without another refactor). Text = `Токены: <used> (<remainingPercent>%)`. Metric is left-aligned inside the chip; right edge is intentionally free.

The outer row width is constant. Width changes between picks (e.g. switching `Sonnet` to `Gpt 5.5 Codex Spark`) reflow only inside the row: chips 1–3 hug their content, chip 4 absorbs the slack via flex.

---

## 2) Single-model invariant (confirmed by user)

Per `SystemArchitecture.md` invariant 14 (effective model identity SSOT) and SMB-001/SMB-002, every logical session is bound to exactly one provider/model through `Session.modelBinding`. The current `SessionStatusInfo.models?: readonly ModelInfo[]` array is a stale generalization — only `models[0]` is ever populated in the active workflow. The new component renders only `models[0]`. No `+N` indicator, no comma joining. Multi-model display is explicitly out of scope.

---

## 3) Connection-not-ready handling (confirmed by user)

The current `Core Supervisor: starting…` fallback and `tokenDebugSummary` debug strip do not belong on this status row in product UX — they were never meant to be the canonical state of the panel. New behavior:

- If `connectionStatus !== "ready"` or `models[0]` is missing: the status row component returns `null` and renders nothing.
- Provider unavailability / collapsed-binding scenarios are out of scope for this change. They will be surfaced through a separate provider-switch surface in a later cycle and must not influence this row.

`tokenDebugSummary` is preserved as an opt-in debug overlay attached to the new component but kept off the canonical 4-chip rhythm — it stays as a small muted line below the row, only when the value is non-null. Same data path as today; only positioning changes.

---

## 4) Reasoning chip rules

- The chip text comes verbatim from `model.reasoning` wrapped in parentheses: `(<reasoning>)`.
- For Claude with thinking disabled, `resolveModelReasoning` already returns `"thinking off"` — the chip will show `(thinking off)`. This is the canonical baseline display for a future model-switch dropdown.
- For Claude/Codex/Gemini with reasoning resolved (`high`, `xhigh`, `reasoning xhigh`, `thinking high`, etc.), the chip shows `(<value>)` directly.
- If `model.reasoning` is `undefined` (rare — provider without an applicable reasoning concept), the reasoning chip is omitted; the row becomes 3 chips.

---

## 5) Provider tint contract

Three accent colors, taken 1-to-1 from existing PM CSS (`session-tab--*`, `session-banner--*`, `animated-dots--*`):

- Claude → `#ff9105`
- Codex → `#01f0d8`
- Gemini → `#ab34cb`

Provider key resolution: from `models[0].providerId` (`claudeCodeCli` / `codexCli` / `geminiCli`) — the same canonical mapping already used by `model-info-builder.ts`. No fallback to `providerSummary` parsing — if `providerId` is unknown the row renders provider-neutral muted styling (defensive only; should not happen with valid `models[0]`).

Default-state text on both buttons is neutral grey `#b0b0b0` (just lighter than the `Модель:` label color), per approved prototype. Hover state uses the provider accent. Active state uses pure white `#ffffff` for all three providers. Buttons are pure visual today — `<button type="button">` with no `onClick`, focus path preserved so future click-to-switch wiring is a one-line attach.

---

## 6) Localization

One new key: `session.status.model_label` (singular `Model`).

- Lives in approved dictionary `assets/localization/source/en/messages_for_the_user.json`.
- Mirror entry into legacy `assets/localization/source/en/system_feedback.json` to match the existing `tokens_label` / `models_label` pattern (registry shadows the legacy file when the approved file is present, but both copies are kept aligned to avoid drift during the transition).
- `session.status.tokens_label = "Tokens"` is reused as-is for the right-most chip.
- `session.status.models_label` (`Models`, plural) becomes unused after this change but stays in the dictionaries — no deletion in this scope.

---

## 7) Component / file boundary

- `src/client/ui/src/session/status-panel.tsx` — rewrite the rendered structure to emit the 4-chip row. The single-line legacy fallback is removed; component returns `null` when not ready. `formatModelSummary` helper becomes obsolete and is removed.
- `packages/ui/project-manager/styles.css` — add the new chip/button class block under the existing `.session-panel` / `.session-id-bar` cluster:
  - `.session-status-row` (flex container, `width: 100%`, `flex-wrap: nowrap`, `gap: 8px`)
  - `.session-status-chip` (label + limits shell, `flex: 0 0 auto`)
  - `.session-status-chip--limits` (`flex: 1 1 0; min-width: 0`)
  - `.session-status-button` (provider-tinted button shape, `flex: 0 0 auto`, default-state grey text, hover/active provider accents)
  - `.session-status-button--claude / --codex / --gemini`
  - `tokenDebugSummary` placement is moved into a small muted strip beneath the row (kept under the same `.session-status` section)
- `assets/localization/source/en/messages_for_the_user.json` and `assets/localization/source/en/system_feedback.json` — add `session.status.model_label` key.
- `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md` — update outputs/structure section to describe the 4-chip surface.
- `src/client/ui/src/session/status-panel.test.tsx` (or new) — assertions: provider class applied, model name + reasoning text, tokens text, reasoning chip omission when `model.reasoning` undefined, returns `null` when `connectionStatus !== "ready"` or `models[0]` missing.

No changes to `session-view.tsx`, `model-info-builder.ts`, `SessionStatusInfo` type, or any data path. The data already arriving in the component is sufficient.

---

## 8) Out of scope

- Click-to-switch model / click-to-switch reasoning (chips are static buttons in this MVP).
- Multi-model rendering, `+N` indicator.
- Provider-collapse / failover surface in this row.
- Right-edge per-session percent rotation in the tokens chip — the right edge is intentionally left free, but no rotation logic is wired in this cycle.
- `tokenDebugSummary` repurposing or removal.

---

## 9) Acceptance

- Status row renders as 4 chips for all three providers; visual parity with `doc/tmp/prototypes/session-input-status-split.html`.
- Switching default model in Settings reflows the row without changing outer width — only the tokens chip resizes (verified visually + via Browser dev tools width inspection on a built `webview` bundle).
- Reasoning chip is hidden when `model.reasoning` is `undefined`.
- `connectionStatus !== "ready"` returns no row at all.
- `npm run typecheck:webview` and `npm run build:webview` pass.
- Husky `pre-commit` (architecture / lint / knip / format) and `pre-push` (`check:dup` / `check:links`) pass without bypass.
- `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md` reflects the new structure.
