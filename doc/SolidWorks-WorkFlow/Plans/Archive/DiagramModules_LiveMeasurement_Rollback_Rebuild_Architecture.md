# Diagram Modules Live Measurement Rollback Rebuild Architecture

**Status:** Approved for implementation
**Date:** 2026-04-08
**Owner:** Codex
**Target release:** 1.1.916

## 1. Problem

После релиза `1.1.915` пользователь подтвердил две проблемы:

- автолайаут `Diagram Modules` по-прежнему допускает наложение нижних границ `MODULE`, `CLUSTER` и `PRODUCT PART`;
- corrective wave `1.1.915` дополнительно внесла регрессию в live-режим: появились зависания и некорректный trim/пересчет при ручном перемещении модулей и кластеров.

Это означает, что scope `Live Measurement Stabilization` не только не устранил исходный дефект автолайаута, но и ухудшил runtime-поведение ручного layout path.

## 2. Decision

В этом corrective cycle не продолжаем развивать unstable `1.1.915` measurement-bridge contract.

Вместо этого:

1. откатываем кодовую базу `Diagram Modules` на поведение релиза `1.1.914` для measurement bridge и связанных regression expectations;
2. убираем из живого SSOT утверждение о принятом `Live Measurement Stabilization` contract как текущем решении;
3. пересобираем новый релиз поверх rollback-базы, чтобы пользователь мог тестировать стабильный baseline без регрессий `1.1.915`.

## 3. Scope

### In scope
- rollback `diagram-editor-measured-layout-bridge.tsx` к предрелизному состоянию `1.1.914`;
- rollback точечных regression expectations, завязанных на stabilized live measurement behavior;
- синхронизация SSOT и release docs под rollback rebuild;
- выпуск нового релиза `1.1.916`.

### Out of scope
- новый алгоритм автолайаута;
- новый ownership solver для `MODULE -> CLUSTER -> PRODUCT PART`;
- дополнительные layout-эксперименты поверх rollback-базы.

## 4. Affected surfaces

- `src/client/project-manager/components/diagram-editor/diagram-editor-measured-layout-bridge.tsx`
- `src/client/project-manager/components/diagram-editor/diagram-editor-facade.test.tsx`
- `doc/SolidWorks-WorkFlow/System/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`
- `README.md`
- `CHANGELOG.md`

## 5. Implementation contract

### 5.1 Code rollback
- Возвращаем bridge к состоянию до scope `Live Measurement Stabilization`.
- Не сохраняем `ResizeObserver`, post-font re-measure и window-resize re-measure hooks, добавленные именно в `1.1.915`.
- Сохраняем только тот measurement contract, который уже был валиден в `1.1.914`.

### 5.2 SSOT rollback
- Живой SSOT не должен утверждать, что stabilized live measurement является принятой текущей архитектурой.
- История corrective wave сохраняется в archived planning-doc и session reports, а не в active system contract.

### 5.3 Release contract
- Новый релиз должен быть отдельной версией поверх rollback-кода, а не переизданием `1.1.914`.
- `README.md` и `CHANGELOG.md` должны явно описывать, что `1.1.916` является rollback rebuild после проблемного `1.1.915`.

## 6. Acceptance criteria

1. В кодовой базе отсутствуют runtime hooks stabilized live measurement wave (`ResizeObserver`, повторный `requestAnimationFrame` scheduling после `document.fonts.ready`, window resize reschedule) в `DiagramEditorMeasuredLayoutBridge`.
2. Regression expectations соответствуют rollback-контракту, а не `1.1.915` behavior.
3. `README.md` и `CHANGELOG.md` описывают новый rollback rebuild release.
4. `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version` проходят успешно.
5. Пользователь получает новый VSIX и tarball-артефакты для проверки rollback-базы.
