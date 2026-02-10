# Session 001 — Архитектурный аудит: двойные источники правды (FULL)

**Date:** 2026-02-10 10:34 (CET)
**Branch:** main
**Version:** 1.1.542

---

# 1. Work Done in This Session

## Work summary
- Выполнен целевой архитектурный аудит по запросу: найдены и документированы «двойные источники правды» (не только в Session UI, но и в runtime/build/protocol/state).
- Подтверждён root-cause проблемы с типографикой Session UI: изменения в одном CSS-контуре не влияли на фактически используемый PM-контур.
- Подготовлен полный перечень хвостов legacy-архитектуры с приоритетами (`P0/P1/P2`), доказательствами (файлы/точки входа) и рисками.
- Код/архитектура в этой сессии не изменялись; это аналитическая сессия с фиксацией полного отчёта.

## Полный архитектурный анализ (FULL)

### Scope и метод
- Проверены контуры: `UI styling`, `UI bundle runtime resolution`, `build/release pipeline`, `session event normalization`, `workspace protocol`, `questionnaire/contracts`, `state stores`, `settings`.
- Анализ выполнен по цепочке «что реально рендерится/исполняется в runtime» vs «что меняется в исходниках».

### Критичные находки

#### P0 — Двойной источник стилей Session UI (прямой root-cause текущего бага)
- Новый контур стилей Session лежит в `media/session-view.css`:
  - `media/session-view.css:192` (`.session-id-bar`)
  - `media/session-view.css:886` (`.session-input__hint`)
  - `media/session-view.css:918` (`.session-status--single-line`)
- Параллельно в PM существует отдельный старый контур в `packages/ui/project-manager/styles.css`:
  - `packages/ui/project-manager/styles.css:1162` (`.session-info__text`)
  - `packages/ui/project-manager/styles.css:1552` (`.session-status__value`)
- PM билд инжектит именно `project-manager/styles.css`, а не `media/session-view.css`:
  - `scripts/build-project-manager.js:63`
- Следствие: визуальные правки в `media/session-view.css` не гарантируют эффект в PM Session UI.

#### P1 — Двойной runtime-контур установки/резолва UI-бандлов
- Инсталлятор одновременно поддерживает два layout:
  - `~/.codeai-hub/ui/...` и `~/.codeai-hub/packages/ui/...`
  - см. `src/extension-module/ui/ui-installer.ts:138` и `src/extension-module/ui/ui-installer.ts:141`
- Резолвер читает сначала packages-layout, затем legacy registry-path:
  - `src/extension-module/ui/ui-path-resolver.ts:20`
  - `src/extension-module/ui/ui-path-resolver.ts:37`
- Это поддерживает миграционный dual-mode и усложняет предсказуемость источника артефакта в runtime.

#### P1 — Два параллельных нормализатора одного event stream
- UI-ветка (Webview) парсит серверные сообщения через:
  - `src/client/ui/src/core-bridge/server-message-handler.ts:117`
- PM-ветка повторно нормализует похожие события отдельно:
  - `src/client/project-manager/components/sessions/session-stream.ts:146`
- Риск: расхождение semantics по `session:error`, `session:binding`, `session:stream`, edge-cases и валидации payload.

#### P1 — Двойной протокол workspace-синхронизации
- Новый протокол: `workspace:select` / `workspace:select:ack`:
  - `src/client/project-manager/api.ts:170`
- Legacy fallback всё ещё активен в коде:
  - `src/client/project-manager/services/workspace-scope-handshake.ts:50`
- Риск: разные semantic expectations в разных частях UI при деградациях/переходных сценариях.

#### P1 — Дублирующиеся контуры questionnaire/path migration
- Канонический + legacy-path resolver и запись в несколько копий файла:
  - `src/client/ui/src/services/idea-questionnaire-paths.ts:22`
  - `src/client/ui/src/services/idea-questionnaire-paths.ts:99`
  - `src/client/ui/src/services/idea-questionnaire-service.ts:240`
- Параллельно PM имеет свой отдельный сервис загрузки/сохранения questionnaire:
  - `src/client/project-manager/services/description-questionnaire-service.ts:133`
- Риск: разный приоритет источников и возможные рассинхроны данных/форматов.

#### P2 — Старый Session host-контур не удалён (только выключен флагом)
- В `src/client/ui/src/app-host.tsx:31` установлен `SETTINGS_ONLY_MODE = true`, но полный Session host-контур остаётся в коде.
- Одновременно PM рендерит `SessionView` через `ProjectManagerSessionView`:
  - `src/client/project-manager/components/sessions/project-manager-session-view.tsx:18`
- Риск: ментальная и архитектурная сложность, дублирующая ответственность за session UI lifecycle.

### Отдельно подтверждённые факты по текущему багу шрифтов
- Изменения в `media/session-view.css` присутствуют и корректны по целевым классам.
- В PM runtime используются стили из `packages/ui/project-manager/styles.css` (через инлайн-инжект в PM bundle), где нужные новые классы отсутствуют.
- Поэтому визуально остались различия размера/цвета/альфы между `ID`, `Models/Tokens/#n` и `Press Enter...`.

### Классификация причин (системно)
- Незавершённые миграции (`legacy/fallback`) оставлены в production-контурах.
- Общие UI-компоненты (`SessionView`) подключены в двух разных delivery-контекстах с разными style-sources.
- Build/release цепочка верифицирует артефакты, но не валидирует единственность источника истины для UI-стилей/протоколов.

### Целевое архитектурное направление (без реализации в этой сессии)
- Единый source of truth для Session UI styles (один файл/пакет/контур сборки).
- Единый runtime layout для UI bundles (убрать dual install layout после миграции).
- Единый message normalization pipeline для session events.
- Удаление legacy workspace handshake после подтверждённого cutover.
- Канонизация questionnaire pipeline вокруг одного сервиса и одного path-policy.
- Физическое удаление выключенных legacy-контуров вместо флагового «хранения на потом».

### Риски без рефакторинга
- Повторяемость визуальных регрессий «исправлено в одном месте, не изменилось в другом».
- Сложность диагностики runtime-поведения из-за hidden fallback-веток.
- Рост стоимости изменений и тестирования каждой новой UI/PM задачи.

### Инвентаризация SSOT (Phase 124 kickoff)

#### Матрица «интерфейсный элемент → канонический владелец»

| Контур | Элемент | Канонический владелец (target) | К удалению/деактивации |
|---|---|---|---|
| Session UI | Tabs/ID bar/Status/Input hint | `media/session-view.css` + единый consumer pipeline | дубли `.session-*` в `packages/ui/project-manager/styles.css` |
| Project Manager UI | Grid/sidebar/toolbar/panels/tokens | `packages/ui/project-manager/styles.css` | `src/client/project-manager/styles/layout.css` |
| Settings UI (VS Code) | Host/cards/dialogs/buttons | общий token-layer (`src/client/ui/src/components/settings/style-tokens.ts`, target) | hardcoded inline-стили в `settings-view.tsx`, `settings-only-host.tsx` и settings-компонентах |
| Runtime UI delivery | install/resolve policy | единый layout policy в `ui-installer/ui-path-resolver` | dual layout fallback `~/.codeai-hub/ui` vs `~/.codeai-hub/packages/ui` |
| Session event contract | payload normalization | единый normalizer в `src/client/ui/src/core-bridge/normalizers.ts` (target shared) | дублирующая normalizer-логика в PM stream |
| Workspace protocol | выбор workspace | `workspace:select` + `workspace:select:ack` | `workspace:scope:set` fallback |
| Questionnaire policy | path/write | единый canonical service policy | legacy multi-copy write paths |

#### Список контуров для decommission в рамках Phase 124

1. `src/client/project-manager/styles/layout.css` (legacy PM CSS source).
2. Дубли `.session-*` / `.settings-overlay*` в `packages/ui/project-manager/styles.css` после cutover на канонический Session stylesheet.
3. Legacy workspace handshake path (`workspace:scope:set`).
4. Legacy dual UI bundle layout resolution fallback.
5. Дублирующие session event normalizers вне shared canonical normalizer.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `N/A` — в этой аналитической сессии новых коммитов не создавалось.

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/TODO/todo-plan.md`
3. `doc/Sessions/Session001.md` (THIS REPORT)

## Plans for next session
- Зафиксировать архитектурный RFC «Single Source of Truth Elimination Program» для UI/PM/runtime layers.
- Нарезать рефакторинг на микростримы (≤3 файлов на подзадачу) начиная с `P0` (Session UI styles source unification).
- После утверждения RFC выполнить реализацию по фазам: стиль/бандл/runtime/event normalization/legacy protocol cleanup.
