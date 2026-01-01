# Session 039 — Codex/Core: реконнект и явные ошибки + релиз 1.1.375

**Date:** 2026-01-01 19:47 (CET)
**Branch:** main
**Version:** 1.1.375

---

# 1. Work Done in This Session

## Work summary
- Исправлена деградация UX при потере соединения с Core: webview на реконнекте просит extension host гарантировать запуск Core (без принудительного рестарта).
- Ошибки провайдера (например, `turn_failed`/`stream_error`) теперь прокидываются из Core в UI как `session:error` и отображаются пользователю как системные сообщения в чате.
- Обновлены release-документы под 1.1.375 (README/CHANGELOG/Architecture/SystemArchitecture).
- Собран релиз 1.1.375: `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`, VSIX создан.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `f4c1669 fix: harden core reconnect and surface provider errors`
- `6895c50 feat: v1.1.375 - core reconnect reliability`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Architecture/Architecture.md`
2. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
3. `doc/Project_Docs/IdeaCollector_Universal_Contract.md`
4. `doc/Sessions/Session039.md` (THIS REPORT)

## Plans for next session
- E2E: воспроизвести сценарий «потеря фокуса/долгий простой → возврат в webview» и убедиться, что:
  - Core поднимается автоматически (или корректно переподключается);
  - при ошибке провайдера в UI появляется системное сообщение (нет “тихой” потери ответа).
- Если проблема повторится без ошибок в UI — собрать диагностические логи `~/.codeai-hub/logs/core/core.log` и `~/.codeai-hub/logs/extension/extension.log` и уточнить, происходит ли shutdown по TTL.
