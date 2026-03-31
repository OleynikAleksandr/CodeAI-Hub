# Session 121 — Release 1.1.760 For Description Help Template Recovery

**Date:** 2026-03-22 11:13 (CET)
**Branch:** main
**Version:** 1.1.760

---

# 1. Work Done in This Session

## Work summary
- Закрыт regression в `Description Help`: если synced `description-template.md` отсутствует в `~/.codeai-hub/templates/description/`, runtime workflow contract теперь сам восстанавливает его из bundled release assets вместо деградации в `template недоступен`.
- Усилен `Description` contract delivery path на стороне Core: self-healing fallback работает до отдачи `description-contract`, поэтому и Help-кнопка, и downstream workflow старт снова получают один и тот же canonical template path.
- Добавлен regression-test, который воспроизводит именно этот кейс: на диске есть prompt/questionnaire, но нет `description-template.md`, и contract обязан материализовать template обратно на диск.
- Обновлены SSOT/release документы: `SystemArchitecture.md`, `README.md`, `CHANGELOG.md`, `todo-plan.md`.
- Собран новый локальный релиз `1.1.760` для повторного regression pass шага `Description` сразу после установки.

## Verification
- `npx tsx --test packages/core/src/remote-bridge/handlers/idea-contract-service.virtual-simulation.test.ts`
- `npx tsx --test src/client/project-manager/components/description/description-step-help.test.ts`
- `npx tsx --test packages/core/src/templates/template-sync-service.test.ts`
- `npm run build:core`
- `npm run build:webview`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

## Release artifacts
- VSIX: `codeai-hub-1.1.760.vsix`
- Tarballs: `doc/tmp/releases/`

## Advisory notes
- `build-release.sh` по-прежнему выводит advisory про broken markdown links в `doc/Sessions/Archive/Session106.md`, но релиз `1.1.760` это не блокирует.

## Git commits
- `9161dd4a fix(workflow): restore missing description help template`
- `b8023453 docs(plan): record description help hotfix`
- `02cbdc7a docs(release): prepare 1.1.760 notes`
- `56574596 chore(release): prepare 1.1.760 assets`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Archive/Session120.md`
6. `doc/Sessions/Archive/Session121.md` (THIS REPORT)

> Далее: установить/запустить локальный релиз `1.1.760`, снова открыть `Description`, проверить кнопку `Help` на fresh install / fresh restart и затем продолжить regression pass по той же анкете.

## Plans for next session
- Подтвердить, что `Description Help` больше не показывает `template недоступен` на `1.1.760`.
- Повторно прогнать `Description` и `Virtual Simulation` на той же анкете и сравнить результат с `1.1.759`.
- Если `Description` стабилен, продолжить regression chain к `Diagram Modules` и `Diagram Facades`.
- Вернуться к оставшимся пунктам `Phase 25`: smarter artifact rewrite semantics, explicit composite archetype support, tighter stage context scoping.
