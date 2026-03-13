# Session 063 — Response Mode Settings release `v1.1.721`

**Date:** 2026-03-13 09:31 (CET)  
**Branch:** codex/baseline-gpt54-release  
**Version:** 1.1.721

---

# 1. Work Done in This Session

## Work summary
- На baseline-линии завершена реализация `Settings -> General -> Response Mode` как отдельного UI/settings/runtime-модуля с фасадами и режимами `Strict`, `Hybrid`, `Debug/Raw`.
- Синхронизированы SSOT-документы под новый response-policy contract: `Docs_Index`, `SystemArchitecture`, `Modules/Codex`, `todo-plan`, а также release-facing `README.md` и `CHANGELOG.md` под версию `1.1.721`.
- В процессе релизной сборки локализован package-level TypeScript дефект в `packages/Codex_Module/src/messaging/structured-output-stream-controller.ts`: workspace build падал из-за ветки, где `state.extractor` логически существовал, но не был доказан для `tsc`. Исправление вынесено в отдельный commit.
- Выполнен полный release cycle baseline-дерева:
  - `npm run compile`
  - `npm run build --workspace @codeai-hub/codex-module`
  - `./scripts/build-all.sh`
  - `./scripts/build-release.sh --use-current-version`
- Получены новые артефакты релиза `v1.1.721`:
  - VSIX: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub-pre-gpt54-v1.1.712/codeai-hub-1.1.721.vsix`
  - tarballs: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub-pre-gpt54-v1.1.712/doc/tmp/releases/`

## Release verification notes
- `build-all` завершился успешно после отдельного фикса `state.extractor` guard.
- `build-release.sh --use-current-version` подтвердил:
  - `Verifying SDK exclusions`
  - `Removing dev dependencies before packaging...`
  - `✅ Package created`
- Итоговый VSIX: `codeai-hub-1.1.721.vsix` (`1.1M`).
- В `General Settings` в кодовой базе зафиксирована новая карточка `Response Mode`; baseline default остаётся `Hybrid`.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через `git show`)
- `e6ddc991 docs(codex): add response mode architecture plan`
- `45318c70 feat(codex): add response mode settings`
- `56d66e2b docs(codex): sync response mode ssot`
- `8fb69fa4 fix(codex): guard structured passthrough extractor`
- `19dc0289 chore(release): build-all v1.1.721`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/Modules/Codex.md`
5. `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`
6. `doc/TODO/todo-plan.md`
7. `doc/Sessions/Session063.md` (THIS REPORT)

## Plans for next session
- Сначала выполнить smoke на `v1.1.721` в реальной инсталляции и проверить persistence/round-trip трёх режимов в `Settings -> General`.
- Проверить поведение `gpt-5.4` в `Hybrid` и `Debug/Raw` на свежем workspace и сравнить raw provider rollout против нашего dialog/history слоя.
- Закрыть оставшийся diagnostic gap из `Phase 291 / Stream 2`: оформить явный append-safe raw provider diagnostic writer contract до UI/history фильтров.
- Затем перейти к `Phase 292`: mode-aware normalization/persistence, fallback progress-layer и regression guards для `strict`, `hybrid`, `debug_raw`.
- Если smoke будет зелёным, готовить следующую итерацию уже не на уровне настройки, а на уровне качества отображения commentary/progress для `gpt-5.4`.
