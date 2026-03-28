# Remaining Audit Debt Closure Architecture

**Status:** Draft
**Created:** 2026-03-28
**Owner:** Oleksandr

---

## 1. Context

`Phase 78` завершена, релиз `1.1.822` собран и зафиксирован как новый рабочий baseline.

Audit `CodeAI Hub Honest Audit` от `2026-03-27` больше не указывает на старый blind spot по `packages/**/src` и уже не может ссылаться на часть закрытых god-module hotspots (`provider-registry/index.ts`, `gemini-session-manager.ts`, provider messaging roots).

После закрытия post-audit packaging tail cleanup и `Wave 2` остаются четыре класса audit-долга:

- metadata drift между `README.md` и `package.json`;
- stale workflow transition tail (`lefthook.yml`, `lefthook` dependency, разъехавшийся release-script narrative);
- отсутствие публичного CI workflow при наличии строгого локального ritual;
- оставшийся audit-visible god-module hotspot `packages/core/src/remote-bridge/handlers/session-request-handler.ts`.

Следующий scope остаётся cleanup-only:

- без feature-expansion;
- без смены product behavior;
- с приоритетом на truthfulness repository surface и уменьшение самого заметного остаточного runtime hotspot-а.

---

## 2. Main Goal

Главная цель следующей фазы:

- убрать оставшиеся truthfulness gaps между тем, что репозиторий декларирует публично, и тем, что он реально делает;
- довести workflow/docs/release surface до одного согласованного narrative;
- начать следующую крупную декомпозицию giant runtime hotspot-а из audit critical path;
- продолжить движение к состоянию, где oversized allowlist только уменьшается.

Практически это означает:

- `README.md`, `package.json`, `scripts/README.md`, `AGENTS.md` и release scripts не должны противоречить друг другу;
- Husky должен быть единственным живым hook workflow;
- публичный CI должен проверять хотя бы тот минимальный набор, который уже считается canonical локально;
- `session-request-handler.ts` должен резаться по responsibility seams, а не получать новый procedural growth.

---

## 3. Decisions

### 3.1. Scope boundary

- Эта фаза закрывает только remaining audit debt.
- Новый product scope, UI polish и provider feature-work сюда не входят.
- Если во время разрезания `session-request-handler.ts` выяснится, что нужен дополнительный preparatory helper без user-visible behavior change, это допустимо только как часть giant-file decomposition.

### 3.2. Order of work

Порядок обязателен:

1. public metadata truthfulness;
2. workflow/release truthfulness;
3. public CI baseline;
4. `session-request-handler.ts` decomposition.

Причина порядка:

- сначала выравниваем публичный narrative репозитория;
- затем добавляем enforcement surface;
- только после этого возвращаемся к самому тяжёлому runtime hotspot-у.

### 3.3. Truthfulness contract

- `README.md` clone target, `package.json.repository.url` и фактический origin должны описывать один и тот же canonical repo.
- `README.md` license wording и `package.json.license` должны давать один и тот же ответ о статусе распространения.
- `scripts/build-release.sh` не должен описывать release flow менее строго, чем canonical local workflow.
- advisory-vs-blocking checks допустимы только если это явно и последовательно описано во всех связанных документах.

### 3.4. Workflow contract

- Husky считается единственным действующим hook engine.
- `lefthook.yml` и `lefthook` dependency либо удаляются, либо получают явный archival status; silent coexistence больше не допускается.
- Публичный CI не обязан полностью дублировать локальный release ritual, но обязан проверять базовые root quality gates:
  - architecture check;
  - lint;
  - ts-prune;
  - compile/type-check path.

### 3.5. SessionRequestHandler decomposition contract

`packages/core/src/remote-bridge/handlers/session-request-handler.ts` режется по already visible seams:

- session resume lifecycle + post-turn context arbitration state;
- session creation / provider binding bootstrap;
- outbound/internal message dispatch and missing-binding guards;
- flow-node rollover/report orchestration;
- root orchestration façade.

Для каждого шага:

- root file должен терять responsibility, а не просто переносить код без уменьшения surface;
- новые helper files должны оставаться `<=300` строк handwritten source;
- allowlist entry удаляется только когда root file реально опускается до `300` строк или ниже.

---

## 4. Work Packages

### 4.1. Public Metadata and Workflow Truthfulness

Цель пакета:

- убрать оставшийся public-surface drift между root metadata и реальным workflow;
- прекратить coexistence Husky/Lefthook narrative;
- выровнять release-script wording с текущим локальным process.

Основные точки:

- `README.md`
- `package.json`
- `package-lock.json`
- `lefthook.yml`
- `scripts/README.md`
- `AGENTS.md`
- `scripts/build-release.sh`

### 4.2. Public CI Baseline

Цель пакета:

- добавить минимальный GitHub CI workflow как публичный enforcement surface;
- убрать audit finding про полное отсутствие visible CI.

Основные точки:

- `.github/workflows/ci.yml`
- `README.md`
- `scripts/README.md`

### 4.3. Core Remote-Bridge Hotspot Reduction

Цель пакета:

- разрезать `session-request-handler.ts` по крупным runtime seams;
- оставить в root file только orchestration/coordination responsibilities;
- подготовить почву для будущих cuts по остальному oversized allowlist без возврата к false-green architecture surface.

Основные точки:

- `packages/core/src/remote-bridge/handlers/session-request-handler.ts`
- новые helper files рядом с ним
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `scripts/check-architecture-rules/max-lines-debt-allowlist.txt`

---

## 5. Success Criteria

Фаза считается закрытой, когда:

- `README.md` и `package.json` больше не расходятся по repo identity и licensing answer;
- stale Lefthook tail удалён из active workflow surface;
- `scripts/build-release.sh`, `scripts/README.md` и `AGENTS.md` описывают один и тот же release contract;
- в репозитории появляется минимальный `.github/workflows/ci.yml`;
- `session-request-handler.ts` теряет хотя бы первый крупный слой multi-responsibility logic, а ideally сводится к thin orchestration surface и покидает oversized allowlist;
- новый `todo-plan.md` снова отражает не placeholder, а активную согласованную фазу.
