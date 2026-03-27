# Post-Audit Tail Cleanup Architecture

**Status:** Draft
**Created:** 2026-03-27
**Owner:** Oleksandr

---

## 1. Context

`Release 1.1.819` уже собран и вручную проверен пользователем: текущий baseline считается рабочим.

Следующий scope не про новые product-возможности. Это post-audit cleanup:

- подчищаем хвосты после уже проведённого аудита;
- доводим packaging surface до чистого release-состояния;
- продолжаем `Wave 2` декомпозицию oversized runtime files;
- удерживаем behavior-preserving refactor как единственный допустимый режим изменений.

Аудит-файл будет добавлен отдельно в рамках текущей сессии. Этот planning-док фиксирует каркас работ заранее, чтобы audit findings только уточняли приоритеты внутри уже согласованного scope, а не меняли саму цель.

---

## 2. Main Goal

Главная цель текущего post-audit плана:

- довести handwritten codebase до архитектурного контракта `1 class / 1 file` там, где модуль реализован как класс;
- не держать handwritten source files длиннее `300` строк;
- сокращать explicit oversized allowlist только в сторону уменьшения;
- не тащить в release/package surface служебные helper files, не нужные пользователю.

Практически это означает:

- каждое новое выделение ответственности должно выноситься в отдельный micro-module;
- root giant file после рефакторинга должен оставаться только façade / entrypoint или тонким contract surface;
- cleanup packaging не должен затрагивать runtime behavior.

---

## 3. Decisions

### 3.1. Release baseline

- `1.1.819` принимается как validated baseline.
- Следующий план работает поверх уже подтверждённого релиза.
- Любая structural cleanup работа должна сохранять этот baseline без product-visible regressions.

### 3.2. Scope split

Новый TODO план состоит из двух фаз:

1. Packaging / Husky helper cleanup.
2. `Wave 2` oversized debt reduction.

Эти фазы разделены специально:

- packaging surface cleanup должен оставаться маленьким, изолированным и легко проверяемым;
- `Wave 2` giant-file decomposition не должен смешиваться с release-facing housekeeping.

### 3.3. Audit handling

- После добавления audit-файла его findings должны быть синхронно отражены в этом planning-доке и в `doc/TODO/todo-plan.md`.
- Audit может менять порядок задач внутри фаз, но не должен расширять scope за пределы:
  - packaging tail cleanup;
  - oversized/runtime debt cleanup.

### 3.4. Architecture contract

- oversized allowlist должен только уменьшаться;
- новый handwritten oversized file вне allowlist запрещён;
- `1 class / 1 file` трактуется как правило decomposition direction:
  - class-based runtime logic не должна слипаться в один multi-responsibility file;
  - façade, contract и typed aggregation files допустимы, если они thin и остаются под line limit;
- если giant file нельзя безопасно опустить ниже `300` строк за один шаг, intermediate step допускается только как thin façade + extracted internals рядом.

---

## 4. Work Packages

### 4.1. Packaging Tail Cleanup

Цель фазы:

- убрать `.husky/_` helper files и прочий служебный release noise из VSIX/package surface;
- синхронизировать packaging contract в документации;
- не менять runtime code, если проблема решается packaging rules.

Основные точки:

- `.vscodeignore`
- release-facing docs (`README.md`, `CHANGELOG.md`)
- при необходимости — workflow/system docs, если packaging contract должен быть зафиксирован как правило.

### 4.2. Wave 2 Oversized Debt

Текущий приоритетный слой после Phase 76:

- `packages/core/src/remote-bridge/handlers/http-api-router.ts`
- `packages/core/src/remote-bridge/index.ts`
- `packages/core/src/workflow/diagram-dsl/diagram-modules-parser.ts`
- `packages/core/src/workspace-runtime/workspace-runtime-facade.ts`
- `packages/core/src/config/index.ts`
- `packages/core/src/remote-bridge/types.ts`
- provider messaging hotspots:
  - `packages/Claude_Module/src/messaging/message-processor.ts`
  - `packages/Codex_Module/src/messaging/message-processor.ts`
  - `packages/Codex_Module/src/messaging/structured-output-stream-controller.ts`
  - `packages/Gemini_Module/src/messaging/message-processor.ts`

Принцип для каждого кандидата один и тот же:

- сначала выделяем seams ответственности;
- затем переносим длинную procedural logic в micro-modules;
- root file оставляем façade или thin export surface;
- после успешного cut файл должен покинуть oversized allowlist, как только реально опустился до `300` строк или ниже.

---

## 5. Success Criteria

План считается выполненным, когда:

- `.husky/_` helper files больше не попадают в VSIX/package surface;
- post-audit packaging tail cleanup закрыт без runtime regressions;
- `Wave 2` backlog последовательно режет oversized debt на confirmed hotspots;
- handwritten source surface движется к состоянию без файлов `>300` строк;
- архитектурный инвариант `одна ответственность на файл` становится не декларацией, а реально соблюдаемой практикой.
