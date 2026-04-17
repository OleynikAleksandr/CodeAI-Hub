# Gemini Initial-Leg Watchdog Bump 1.2.11 — Planning Doc

## 1. Problem

В 1.2.10 retest на Gemini 3.1 Pro Preview + `thinkingLevel=high` первый turn на Description шаге упал через 60с с `Gemini stream stalled after 60s without progress.` Переключение `thinkingLevel=low` решило проблему.

Root cause — жёсткий `DEFAULT_STALLED_TURN_WATCHDOG_MS = 60_000` в [`packages/Gemini_Module/src/session/gemini-session-lifecycle.ts`](packages/Gemini_Module/src/session/gemini-session-lifecycle.ts). Для `high` thinking на больших prompt'ах (Description Agent system-instruction + questionnaire) Gemini SDK уходит в deep-reasoning фазу с молчанием на stream канале > 60с перед первым `content`/`thought` event'ом. Watchdog их режет как stalled.

Pre-existing baseline bug, не регрессия 1.2.10.

## 2. Solution

**Простой bump:** поднять `DEFAULT_STALLED_TURN_WATCHDOG_MS` с 60_000 до 240_000. Post-tool watchdog (120_000) оставить как есть — он уже учитывал follow-up reasoning.

Отвергнуто: adaptive-по-thinking-level (мой изначальный план). Причина: user предпочёл плоское решение для быстрой проверки; если 240с окажется недостаточно — поднимем ещё в 1.2.12.

## 3. Structure

Никаких новых классов. Одна константа меняется.

## 4. Contracts

Invariant 7 (Gemini stalled-turn watchdog): `DEFAULT_STALLED_TURN_WATCHDOG_MS = 240_000` (было 60_000). Post-tool остаётся 120_000.

## 5. Release

1.2.11 VSIX + tarballs. Hygiene-only, retest пользователем на Gemini 3.1 Pro + thinking=high.

## 6. Out of scope

- Adaptive timeouts per thinking level — отложено.
- Unit-test на watchdog timing — не имеет смысла без симуляции реального Google API latency.
