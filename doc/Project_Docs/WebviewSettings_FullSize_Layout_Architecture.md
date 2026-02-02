# VS Code Webview — Settings: Full-size layout (Architecture)

**Date:** 2026-02-02
**Scope:** VS Code Webview Settings UI (Settings-only)
**Status:** Approved (Phase 90)
**Owner:** Oleksandr + Codex

---

## 1) Problem

Сейчас окно Settings в VS Code Webview открывается как overlay/модалка по центру Webview.

Проблемы UX:
- впустую теряется площадь (особенно по ширине), опции видны хуже;
- приходится чаще скроллить, хотя свободное место есть;
- поведение не соответствует ожиданию «страницы настроек».

## 2) Goal

Сделать Settings UI **полноэкранным** внутри Webview:
- занимает **всю доступную площадь** контейнера Webview;
- автоматически подстраивается под ресайз;
- сохраняет **вертикальную прокрутку**, если контент не помещается;
- без горизонтального скролла по умолчанию.

## 3) Non-goals

- Не меняем контент/состав настроек.
- Не добавляем новые роуты/навигацию (если можно обойтись существующей структурой).
- Не меняем архитектуру Core/API.

## 4) Proposed solution

### 4.1 UI концепт

Settings перестаёт быть «центральной модалкой» и становится **panel/view**, который:
- рендерится в root-контейнере Webview как основной экран;
- имеет собственный scroll container (`overflow-y: auto`).

Кнопка `Open settings`:
- либо переключает состояние root view на Settings,
- либо открывает Settings в существующем контейнере, но с layout `fullSize` (без centered overlay).

### 4.2 Layout/CSS инварианты

Минимальные требования к CSS/DOM:
- root Webview контейнер: `height: 100%`, `width: 100%`;
- Settings container: `height: 100%`, `width: 100%`;
- scroll: `overflow-y: auto`, `overflow-x: hidden`;
- не использовать `position: fixed` + `top/left: 50%` + `transform: translate(-50%, -50%)` для обёртки Settings.

Если используется overlay/backdrop слой:
- backdrop допускается только как «фон» без центровки контента;
- контент Settings должен растягиваться (`inset: 0`) и иметь padding по сетке.

### 4.3 Accessibility

- Settings должен оставаться клавиатурно доступным.
- Если есть кнопка закрытия/back, она должна быть `<button>` и иметь понятный label.

## 5) Verification checklist (manual)

1) Открыть VS Code → открыть Webview → нажать `Open settings`.
2) Ожидаемое:
   - Settings занимает всю площадь Webview.
   - При ресайзе панели VS Code layout адаптируется без артефактов.
   - Вертикальный скролл появляется только при необходимости.
   - Горизонтального скролла нет (кроме крайних случаев очень узкого окна).

## 6) Files / ownership (expected)

- Webview UI:
  - компонент, который рендерит Settings overlay/view;
  - стили контейнера Settings/root (CSS/Styled/Emotion — по текущей реализации).

## 7) Rollout

Изменение должно быть локальным для Settings-only UI и не затрагивать Project Manager.
