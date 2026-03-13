# Session 065 — Response-mode promotion fix release `v1.1.722`

**Date:** 2026-03-13 10:12 (CET)  
**Branch:** codex/baseline-gpt54-release  
**Version:** 1.1.722

---

# 1. Work Done in This Session

## Work summary
- Реализован минимальный runtime-fix для baseline-линии `v1.1.712`: response-mode state теперь переживает `temp session id -> real thread id` promotion в Codex runtime.
- Исправлена подтверждённая regression-причина пустого dialog history в `Debug/Raw`/`Hybrid`, когда после `thread.started` controller терял `passthrough` config и откатывался в `DEFAULT_TURN_CONFIG`.
- Добавлен узкий regression guard на `StructuredOutputStreamController`, покрывающий оба passthrough режима: `hybrid` и `debug_raw`.
- Синхронизированы release-facing документы `README.md` и `CHANGELOG.md` под новый baseline release `v1.1.722`.
- Выполнен полный release cycle:
  - `npm run build --workspace @codeai-hub/codex-module`
  - `node --test packages/Codex_Module/dist/messaging/structured-output-stream-controller.test.js`
  - `./scripts/build-all.sh`
  - `./scripts/build-release.sh --use-current-version`

## Release result
- VSIX: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub-pre-gpt54-v1.1.712/codeai-hub-1.1.722.vsix`
- VSIX size: `1158395 bytes`
- Tarballs:
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub-pre-gpt54-v1.1.712/doc/tmp/releases/claude-module-1.1.722.tar.bz2`
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub-pre-gpt54-v1.1.712/doc/tmp/releases/codex-module-1.1.722.tar.bz2`
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub-pre-gpt54-v1.1.712/doc/tmp/releases/gemini-module-1.1.722.tar.bz2`
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub-pre-gpt54-v1.1.712/doc/tmp/releases/codeai-hub-core-darwin-arm64-1.1.722.tar.bz2`
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub-pre-gpt54-v1.1.712/doc/tmp/releases/CodeAIHubLauncher-macos-arm64-1.1.722.tar.bz2`
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub-pre-gpt54-v1.1.712/doc/tmp/releases/vscode-webview-1.1.722.tar.bz2`
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub-pre-gpt54-v1.1.712/doc/tmp/releases/project-manager-1.1.722.tar.bz2`

## Notes
- `build-release.sh --use-current-version` подтвердил ключевые финальные шаги:
  - `Verifying SDK exclusions`
  - `Removing dev dependencies before packaging...`
  - `✅ Package created`
- После сборки пользователь подтвердил успешный smoke на установленном `1.1.722`:
  - `Debug/Raw` работает корректно и пропускает промежуточные сообщения агента Codex в диалог.
  - `Hybrid` работает аналогично `Debug/Raw` и тоже пропускает промежуточные сообщения агента Codex.
- Сессия завершена как успешная реализация baseline-fix; дальнейшая работа по режимам `Strict / Hybrid / Debug/Raw` переносится в отдельную исследовательскую итерацию, а не в блокирующий post-release hotfix.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через `git show`)
- `d03fa210 docs(codex): record debug raw promotion regression`
- `67da3fb6 fix(codex): preserve response mode across session promotion`
- `7e9d370c test(codex): guard response mode session promotion`
- `a5b5f649 docs(release): prepare v1.1.722 notes`
- `142e0958 chore(release): build-all v1.1.722`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/Modules/Codex.md`
5. `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`
6. `doc/BugRegistry.md`
7. `doc/TODO/todo-plan.md`
8. `doc/Sessions/Session064.md`
9. `doc/Sessions/Session065.md` (THIS REPORT)

## Plans for next session
- Немедленных hotfix-задач по baseline-релизу `1.1.722` не осталось: пользователь подтвердил рабочий `Debug/Raw` и рабочий `Hybrid`.
- При следующем возврате к теме response modes продолжать уже как отдельное улучшение, а не как аварийный repair:
  - вернуться к оставшимся пунктам `Phase 291 / Stream 2` и `Phase 292`;
  - отдельно исследовать, что можно улучшить в `Strict / Hybrid / Debug/Raw` без риска для текущего стабильного baseline.
- Если тема будет возобновлена, не менять рабочий promotion-fix без нового воспроизводимого regression-case.
