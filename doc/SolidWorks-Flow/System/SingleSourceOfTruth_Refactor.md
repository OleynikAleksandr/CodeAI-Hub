# Single Source of Truth Refactor — Architecture RFC (Phase 124)

**Status:** Approved baseline for implementation  
**Owner:** Oleksandr  
**Phase:** 124  
**Last updated:** 2026-02-17

---

## 1. Problem Statement

В текущей архитектуре существуют параллельные источники правды для UI/Runtime/Protocol слоёв. Это приводит к регрессиям класса «изменение внесено, но визуально/поведенчески не применилось в активном runtime-контуре».

Критичный пример: Session UI типографика была обновлена в одном CSS-контуре, но Project Manager использовал другой контур и отрисовывал старые значения.

---

## 2. Refactor Goal

Закрепить для каждого элемента интерфейса и каждого runtime-контракта **ровно один канонический владелец** (single source of truth), а все legacy/fallback дубли перевести в deprecation и удалить.

---

## 3. Scope

Refactor покрывает:
- Session UI (tabs, id-bar, status panel, input hint, dialog rails);
- Project Manager layout/theme pipeline;
- Settings UI в VS Code webview;
- UI bundle install/resolve layout;
- session event normalization pipeline;
- workspace selection protocol;
- questionnaire path/write policy.

---

## 4. Architectural Rules (SSOT)

1. Один UI элемент может иметь только один style-owner (один канонический файл/модуль токенов).
2. Один runtime путь доставки/резолва артефакта может иметь только один активный layout policy.
3. Один transport/event contract может иметь только один canonical normalizer.
4. Legacy fallback допускается только как временная миграционная стадия с фиксированным сроком удаления.
5. Любое добавление второго источника блокируется архитектурным гейтом.

---

## 5. Canonical Ownership Matrix

## 5.1 Session UI

| UI элемент | Канонический style owner (target) | Канонический runtime consumer | Legacy источник на удаление |
|---|---|---|---|
| Session tabs | `media/session-view.css` | VS Code webview + PM через единый CSS pipeline | `packages/ui/project-manager/styles.css` (дубли `.session-*`) |
| Session ID bar | `media/session-view.css` | VS Code webview + PM через единый CSS pipeline | Локальные/старые PM-правила без `.session-id-bar*` |
| Status panel | `media/session-view.css` | VS Code webview + PM через единый CSS pipeline | PM-переопределения `.session-status__*` |
| Input hint typography | `media/session-view.css` (`.session-input__hint`) | Все session-плашки/инфо-строки | Любые inline/локальные style overrides |
| Settings overlay shell (в Session runtime) | `media/session-view.css` | Webview runtime | PM-дубль `.settings-overlay*` |

## 5.2 Project Manager Layout

| UI элемент | Канонический style owner (target) | Канонический runtime consumer | Legacy источник на удаление |
|---|---|---|---|
| PM layout/grid/sidebar/panels | `packages/ui/project-manager/styles.css` | PM bundle (`dist/index.html`) | `src/client/project-manager/styles/layout.css` (removed in 1.1.622; guardrail blocks reintroduction) |
| PM token palette (`--pm-*`) | `packages/ui/project-manager/styles.css` | PM bundle | Дубли token definitions в других CSS |

## 5.3 Settings UI (VS Code)

| UI элемент | Канонический style owner (target) | Канонический runtime consumer | Legacy источник на удаление |
|---|---|---|---|
| Settings host container | `src/client/ui/src/components/settings/style-tokens.ts` + shared style layer | Settings webview | Разрозненные inline-цвета в `settings-view.tsx` / `settings-only-host.tsx` |
| Settings cards/dialogs/buttons | Shared settings token/style modules | Settings webview | Дубли hardcoded hex в component-level style objects |
| Provider-specific accents | Semantic tokens (`provider.claude/codex/gemini`) | Settings webview | Прямые hex-константы в карточках/диалогах |

## 5.4 Runtime / Protocol Contracts

| Контур | Канонический owner (target) | Legacy источник на удаление |
|---|---|---|
| UI bundle install/resolve layout | `src/extension-module/ui/ui-installer.ts` + `ui-path-resolver.ts` (single layout policy) | Dual layout `~/.codeai-hub/ui` vs `~/.codeai-hub/packages/ui` |
| Session event normalization | `src/client/ui/src/core-bridge/normalizers.ts` (shared canonical normalizer) | Дублирующий парсинг в PM stream pipeline |
| Workspace selection protocol | `workspace:select` + `workspace:select:ack` | `workspace:scope:set` fallback |
| Questionnaire path policy | Единый path/write policy service | Legacy multi-copy writes |

---

## 6. Migration Phases (linked to TODO Streams)

1. Architecture Canonicalization (this RFC + SystemArchitecture sync).
2. UI Source-of-Truth Inventory (элементная матрица + deprecation list).
3. Session UI Style Source Unification.
4. PM Build CSS Pipeline Cleanup.
5. PM Legacy CSS Decommission.
6. Settings UI Token Canonicalization.
7. Settings Cards/Dialogs Unification.
8. Runtime/Protocol SSOT streams (bundle layout, event normalization, workspace protocol, questionnaire policy).
9. SSOT guardrails in architecture checks.
10. QA gates + release build.

---

## 7. Acceptance Criteria (Definition of Done)

1. Для каждого UI элемента Session/PM/Settings существует один documented style-owner.
2. Удалены legacy CSS/JS протоколы, обозначенные как decommission targets.
3. `scripts/check-architecture.sh` блокирует повторное появление вторых источников для канонизированных контуров.
4. PM и Webview показывают идентичную типографику для общих Session UI элементов (ID bar, status line, input hint).
5. Settings UI не содержит неканоничных hardcoded дублей для базовых цветов/шрифтов/границ вне токен-слоя.

---

## 8. Risks and Mitigations

- Риск: скрытые зависимости на legacy-контуры в runtime.
  - Митигация: phased decommission + targeted build checks после каждого стрима.
- Риск: визуальные регрессии из-за консолидации CSS.
  - Митигация: snapshot/manual QA чек-лист на Session/PM/Settings перед релизом.
- Риск: долгий хвост миграции из-за смешанных стилей в Settings.
  - Митигация: сначала канонизация токенов, затем поэтапный перевод компонентов.

---

## 9. Open Items (must be resolved during implementation)

1. Финальный формат общего style-token layer для Settings (`TS module` vs `CSS variables bridge`).
2. Стратегия подключения `media/session-view.css` в PM без дублирования build-пайплайна.
3. Политика удаления legacy-fallback для UI bundle layout (cutover criteria).
