# PM Translation Engine Selector CEF Crash — Architecture

## Problem
- В `1.2.54` standalone Project Manager на macOS 26.x падает при попытке взаимодействовать с `Settings -> Localization -> UI Translation Engine`.
- Crash report указывает на `NSInvalidArgumentException` / `-[NSApplication %s]: unrecognized selector` на main thread внутри Chromium/AppKit path.
- Пользовательский save/localization flow здесь ни при чём: crash случается на selector interaction, ещё до meaningful Core-side persistence.

## Confirmed Trigger
- Shared `TranslationEngineSelector` всё ещё использует native HTML `<select>`.
- `LocalizationLanguageCombobox` в том же разделе уже является custom DOM-owned combobox/listbox и не зависит от AppKit-native popup.
- Следовательно, translation-engine selector остаётся единственной живой native popup seam в localization settings path.

## Root Cause
- Это новая trigger-ветка уже известной CEF/macOS 26 incompatibility family вокруг `NSApplication unrecognized selector`.
- Release `1.2.52` принципиально устранил только red-window-close teardown path через `-[NSApplication terminate:]`.
- Native `<select>` popup внутри Chromium 141/CEF всё ещё может уходить в другой AppKit branch, который обходит текущий workaround и приводит к тому же классу crash.

## Decision
- Удалить native `<select>` из shared `TranslationEngineSelector`.
- Перевести translation-engine controls на DOM-owned selector surface:
  - trigger button;
  - in-DOM option list;
  - keyboard navigation (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`);
  - disabled-state labelling для unavailable engines.
- Новый control остаётся shared между PM и VS Code-host, но главный смысл решения: не заходить в AppKit-native popup path в standalone CEF.

## Scope
- `src/client/ui/src/components/settings/localization-translation-engine-selector.tsx`
- при необходимости минимальная sync-правка в `doc/BugRegistry.md`, `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`, `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md`

## Non-Goals
- Не расширять launcher bridge.
- Не вводить новую ObjC exception mitigation ради popup/select path.
- Не менять Core-side settings persistence/localization classifier.

## Validation
- `npm run build:webview`
- `npm run build:project-manager`
- smoke в standalone PM: открыть `UI Translation Engine` и `Reasoning Translation Engine`, убедиться что dropdown открывается без системного crash dialog.
