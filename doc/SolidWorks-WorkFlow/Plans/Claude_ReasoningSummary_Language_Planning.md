# Claude Reasoning Summary Language Planning

**Status:** Accepted implementation scope
**Date:** 2026-05-29

## Problem

Claude visible thinking/reasoning summaries are currently source-first and then translated asynchronously when the user's reasoning language is not English. Runtime probing showed that Claude can emit visible thinking summaries directly in Russian when the system prompt explicitly asks for reasoning summaries to follow the selected user language.

If Claude already emits reasoning in the selected language, the provider-local translation fallback must not translate it again.

## Scope

- Add an explicit Claude workflow system-prompt instruction for visible thinking/reasoning summaries to use the runtime reasoning/chat language.
- Keep private chain-of-thought private; only safe visible summaries are affected.
- Add a language guard before provider-local Claude reasoning translation so Cyrillic Russian text with `targetLanguage=ru` is not retranslated.
- Cover the guard with a targeted unit test.
- Sync the Claude module SSOT after implementation.

## Out Of Scope

- Codex reasoning summary localization. Runtime probes showed Codex app-server reasoning summaries do not reliably follow prompt language instructions.
- Release build.
- Changes to shared Core translation overlay scheduling.
