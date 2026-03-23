# Diagram Modules Canonical Order Heading Blockers After 1.1.774

**Date:** 2026-03-23  
**Status:** Planning baseline for follow-up fixes after live retest `1.1.774`

---

## 1. Problem Statement

После релиза `1.1.774` пользователь подтвердил новый ранний staged blocker:

1. `product-parts.index.md` создаётся.
2. Но `Artifacts` остаётся пустым: нет даже `Product Part` skeleton-плашек.
3. Hidden continuation не стартует, поэтому sequence останавливается уже после index-файла.

Итоговый симптом:

- `Diagram Modules` визуально пуст после записи `product-parts.index.md`;
- дальнейшие `product-parts/<part-id>.md` не materialize-ятся автоматически.

---

## 2. Confirmed Root Cause

### 2.1. Live index format drifted again

Текущий live `product-parts.index.md` в реальном workspace имеет новый shape:

- `## Canonical Order`
- блоки вида `### 1. \`vs-code-extension-shell\``
- затем plain text поля:
  - `Name: ...`
  - `Purpose: ...`

Подтверждённый live artifact:

- `.codeai-hub/<workspaceSlug>/diagram_modules/product-parts.index.md`

Но текущие parser paths в `1.1.774` всё ещё умеют читать только три shape:

1. legacy `### Product Part: ...`
2. numbered list `1. \`id\` — \`Title\``
3. markdown table `| Order | Part ID | Product Part | Purpose |`

Следствие:

- `buildDiagramModulesSkeletonFromIndex(...)` возвращает пустой `productParts[]`;
- React Flow остаётся пустым;
- `readDiagramModulesProgressSnapshot(...)` не находит planned part ids и остаётся на `substep: index`, поэтому continuation не стартует.

### 2.2. Same mismatch exists in both client and runtime progress path

Новый drift нужно чинить сразу в двух местах:

- `src/client/project-manager/components/diagram-editor/diagram-modules-progressive-model.ts`
- `packages/core/src/remote-bridge/handlers/diagram-modules-progress.ts`

Если исправить только один из них:

- либо появится skeleton без continuation;
- либо continuation стартует, но UI останется пустым.

---

## 3. Constraints

- Продолжать микро-задачами не более 3 файлов на commit.
- Сначала оформить новый planning baseline и Phase.
- Затем одним микростримом починить и client-side skeleton parser, и server-side progress snapshot parser, плюс targeted regression test.
- После фикса обязателен новый patch release и новый user retest.

---

## 4. Fix Streams

### Stream A — Canonical order heading parser recovery

Goal:

- научить staged index parsing принимать live `## Canonical Order` blocks с `### <n>. \`part-id\``, `Name:` и `Purpose:`.

Primary files:

- `src/client/project-manager/components/diagram-editor/diagram-modules-progressive-model.ts`
- `packages/core/src/remote-bridge/handlers/diagram-modules-progress.ts`
- targeted regression test file

Expected result:

- после записи `product-parts.index.md` снова появляются `Product Part` плашки;
- hidden continuation снова получает `currentPartId` и стартует автоматически.

### Stream B — Retest release

Goal:

- выпустить новый baseline только после parser recovery;
- повторно проверить live `Diagram Modules`.

---

## 5. Acceptance Criteria

- Live `product-parts.index.md` с `## Canonical Order` и блоками `### 1. \`part-id\`` больше не даёт пустой skeleton.
- `Diagram Modules` снова показывает `Product Part` cards сразу после index write.
- `diagramModulesProgress` снова определяет `plannedCount`, `generatedCount` и `currentPartId` по этому live format.
- Hidden continuation снова уходит автоматически без ручного user prompt.
