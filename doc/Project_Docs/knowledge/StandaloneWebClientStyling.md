# Standalone Web Client Styling Checklist

## Purpose
Обеспечить, чтобы автономный браузерный клиент (вне VS Code) всегда выглядел так же, как webview-версия. Документ фиксирует ключевые требования и проверки, предотвращающие потерю оформления (case 2025-10-22 — Safari renders unstyled HTML).

## Key Requirements
- **Shared React bundle**: автономный клиент должен использовать тот же `media/react-chat.js`, что и webview. Все изменения UI делаются в `src/client/ui/src` и одной командой `npm run build:webview`/`npm run build:web-client` попадают в оба интерфейса.
- **Inline CSS**: при сборке `npm run build:web-client` скрипт `scripts/build-web-client.js` обязан встраивать содержимое `media/main-view.css`, `media/session-view.css`, `media/react-chat.css` внутрь `media/web-client/dist/index.html`. Без этого браузер не увидит тему (пример: Safari блокирует относительные пути). Любые новые глобальные стили добавляем в эти файлы — они автоматически попадут в инлайн-блок.
- **VS Code tokens fallback**: в `media/web-client/index.html` задаём все критичные `--vscode-*` и собственные токены (цвета, шрифты). Если webview добавляет новый токен, держим его дефолт здесь же, иначе браузер получит “серый” вариант.
- **Local message router**: автономный клиент должен реагировать на `postVsCodeMessage` без VS Code. Модуль `src/client/web-client/environment.ts` эмулирует команды (`newSession`, `providerPicker:confirm`, `session:clearAll`) и распространяет события через `window.postMessage`. Это гарантирует, что интерфейс оживает даже без ядра/bridge.
- **macOS launcher**: создаём `CodeAI Hub Web Client.app` (см. `src/extension-module/web-client/shortcut-manager.ts`). Старые `.command`/`.webloc` удаляем — приложение открывает HTML и не запускает Terminal. Windows/Linux аналоги (`.lnk`, `.desktop`) должны указывать на тот же `dist/index.html`.

## Validation Checklist (per release)
1. `npm run build:web-client` → проверить, что `media/web-client/dist/index.html` содержит `<style id="codeai-hub-theme">` с актуальными CSS.
2. Открыть `codeai-hub-*.vsix` (или установленное расширение) в Safari/Chrome по `file:///…/media/web-client/dist/index.html` и убедиться, что UI идентичен webview (Action Bar, Provider Picker, вкладки, Settings).
3. Убедиться, что `src/client/web-client/environment.ts` обрабатывает все команды, используемые в webview (добавляя новые — обновлять обе стороны).
4. Проверить, что `scripts/build-release.sh` вызывает `npm run build:web-client` до упаковки VSIX.

## Related Documents
- `doc/Architecture/Architecture.md` — раздел Local Web Client.
- `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md` — описание клиентов.
- `doc/TODO/todo-plan.md` — фаза 9, задачи по стилизации и локальному message router.
