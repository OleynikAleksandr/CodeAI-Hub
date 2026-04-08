# Project Manager Release Rebuild 1.1.913 Architecture

**Status:** Approved for execution
**Date:** 2026-04-08
**Owner:** Oleksandr + Codex
**Scope:** release-only rebuild after user reported that Project Manager did not refresh on top of release `1.1.912`

---

## 1. Problem

После выпуска `1.1.912` пользователь сообщил, что локальный `Project Manager` не обновился.

На этом corrective cycle мы не открываем новый product-logic scope. Цель здесь узкая:
- выпустить новый набор артефактов с новым номером версии;
- принудительно обновить `project-manager` tarball и финальный `VSIX`;
- сохранить release lifecycle в штатном виде: planning doc, todo-plan, session report, closeout.

---

## 2. Decision

Для этого цикла принимается release-only strategy:

1. Новых кодовых изменений в `Project Manager` не вносим.
2. Выпускаем новый релизный номер поверх актуального состояния `main`.
3. Перед релизом синхронизируем release-facing документы (`README.md`, `CHANGELOG.md`).
4. Прогоняем стандартный release pipeline:
   - `npm run build:webview`
   - `npm run typecheck:webview`
   - `./scripts/build-all.sh`
   - `./scripts/build-release.sh --use-current-version`
5. После сборки проверяем, что появились свежие артефакты:
   - `project-manager-<new-version>.tar.bz2`
   - `codeai-hub-<new-version>.vsix`

---

## 3. Scope Boundaries

В scope входят:
- release planning и execution documentation;
- release-facing docs (`README.md`, `CHANGELOG.md`);
- version bump и пересборка release artifacts.

В scope не входят:
- новые исправления `Diagram Modules`;
- новые изменения автолайаута;
- новые UI/logic patches в `Project Manager`.

---

## 4. Acceptance Criteria

Scope считается завершённым, только если:

1. Собран новый релизный номер после `1.1.912`.
2. В корне репозитория появился новый `codeai-hub-<version>.vsix`.
3. В `doc/tmp/releases/` присутствует свежий `project-manager-<version>.tar.bz2`.
4. `README.md` и `CHANGELOG.md` синхронизированы с новым номером релиза.
5. Planning-doc и `todo-plan` закрыты и заархивированы, а новый session report подготовлен для closeout.
