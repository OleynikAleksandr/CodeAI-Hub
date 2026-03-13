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
- Реальный smoke на установленном `1.1.722` в этой сессии не прогонялся; пользовательский runtime-валидатор остаётся следующим обязательным шагом.

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
- Сначала сделать реальный smoke на установленном `codeai-hub-1.1.722.vsix` в workspace `gpt-5.4`, в первую очередь на `Settings -> General -> Debug/Raw`.
- Проверить, что после runtime-fix commentary и final answer действительно попадают в unified-session/dialog JSONL, а не только в raw provider rollout.
- Если smoke зелёный, вернуться к оставшимся пунктам `Phase 291 / Stream 2` и `Phase 292`: raw diagnostic writer contract и fallback progress-layer для случаев без provider commentary.
- Если smoke не зелёный, локализовать уже следующий слой проблемы, но не трогать текущий promotion-fix без прямого подтверждения новой поломки.
