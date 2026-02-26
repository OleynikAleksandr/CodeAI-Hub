# Project Manager — Description Entry Copy Refactor (Contract)

## 1. Проблема

В левом Session-регионе Project Manager до появления первой сессии показывается legacy copy:
- `Create your first session`
- `Use the buttons above to start a session. Select one provider in the picker to begin.`

Этот текст вводит в заблуждение для workflow `Description`: старт сессии выполняется не через toolbar, а после заполнения анкеты в правой панели артефактов и явного действия `Submit questionnaire`.

Дополнительно в текущем UI остались русскоязычные CTA:
- `Отправить анкету`
- `Закрыть`

Они должны быть приведены к англоязычной UI-терминологии, чтобы copy была консистентной с остальным интерфейсом.

## 2. Цель и границы

### Цель
Обновить entry-copy и CTA так, чтобы пользователь однозначно понимал реальный стартовый сценарий шага `Description`.

### In scope
1. Обновление текста EmptyState в Session-регионе.
2. Замена CTA `Отправить анкету` и `Закрыть` на английские аналоги в Description questionnaire flow.
3. Сохранение существующей логики запуска сессии без функциональных изменений.

### Out of scope
1. Любые изменения workflow-гейтинга, session routing, continuity, dialog matching.
2. Перестройка layout или компонентов вне copy/labels.

## 3. Контракт UX-копирайта

### 3.1 Session EmptyState (левая панель)
В состоянии `session == null` и `pending == false` текст должен сообщать:
1. сначала заполнить анкету в правой панели (`Artifacts`),
2. затем нажать `Submit questionnaire`,
3. после этого выбрать провайдера в picker.

### 3.2 Description questionnaire CTA
Кнопки должны быть англоязычными:
- `Submit questionnaire`
- `Close`

## 4. Затрагиваемые компоненты (минимум)

1. `src/client/ui/src/session/empty-state.tsx`
2. `src/client/project-manager/components/description/description-questionnaire-panel.tsx`
3. `src/client/ui/src/app-host/session-region-questionnaire-copy.ts` (если label берётся из shared copy)

## 5. Инварианты

1. Никаких изменений бизнес-логики запуска Description сессии.
2. Никаких изменений event-каналов (`pm:dialog:open`, `pm:session:open`, и т.д.).
3. Текущие pending/loading состояния остаются без изменений.

## 6. Критерии приемки

1. В пустом Session-регионе отображается новый, корректный entry-text про `Artifacts` + `Submit questionnaire`.
2. В Description questionnaire panel кнопки отображаются на английском (`Submit questionnaire`, `Close`).
3. Запуск Description после отправки анкеты работает как прежде (без регрессий).

## 7. Верификация

1. Smoke в PM UI:
   - открыть workspace без активной сессии;
   - проверить новый EmptyState copy;
   - заполнить анкету и нажать `Submit questionnaire`;
   - убедиться, что открывается provider picker и стартует сессия.
2. Таргетно: `npm run typecheck:webview`.
