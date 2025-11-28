# Quality Gate Manager — Project Bootstrap Guide

Документ описывает полный цикл запуска нового проекта CodeAI‑Hub «с нуля», чтобы сразу включить автоматические гейты качества: Ultracite (Biome), архитектурный скрипт, Husky, дублирование и проверку ссылок. Следуя шагам, можно разворачивать рабочее окружение без дополнительного контекста.

## 1. Предварительные требования
- macOS / Linux с установленными `git`, `node >= 20`, `npm >= 10`.
- Доступ к репозиторию CodeAI-Hub (для копирования `scripts/`).
- Установленное расширение VS Code `biomejs.biome` (установится автоматически через `ultracite init`, но можно поставить вручную командой `code --install-extension biomejs.biome`).

## 2. Стартовая инициализация
1. Создайте папку проекта и перейдите в неё:
   ```bash
   mkdir CodeAI-Hub && cd CodeAI-Hub
   ```
2. Инициализируйте Git:
   ```bash
   git init
   ```
3. Создайте базовый `package.json`:
   ```bash
   npm init -y
   ```

## 3. Установка Ultracite и базовой конфигурации
1. Запустите мастер установки Ultracite (добавит `biome.jsonc`, `.vscode/settings.json`, Husky‑хуки и файлы правил для агентов):
   ```bash
   npx ultracite@latest init --pm npm --editors vscode --rules claude codex gemini-cli --hooks claude --integrations husky
   ```
   > Если нужны другие AI-правила или интеграции, перечислите их через пробел (`--rules cursor windsurf`, `--integrations lefthook` и т.п.).
2. Проверьте, что созданы файлы: `.vscode/settings.json`, `biome.jsonc`, `.husky/pre-commit`, `.husky/pre-push`, `.claude/CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `package-lock.json` и установлены dev-зависимости (`ultracite`, `@biomejs/biome`, `husky`).

## 4. Дополнительные dev-зависимости
Установите инструменты, которые использует архитектурный скрипт и pre-push гейты:
```bash
npm install -D -E jscpd ts-prune markdown-link-check
```

## 5. Копирование каталога `scripts/`
1. Скопируйте готовый набор скриптов из репозитория CodeAI-Hub (путь укажите относительно вашей копии шаблона). Пример:
   ```bash
   rsync -a ../CodeAI-Hub_0.0.17/scripts/ ./scripts
   ```
   или (если находитесь в действующем репозитории) используйте локальную копию `scripts/`.
2. Убедитесь, что файлы исполняемые:
   ```bash
   chmod +x scripts/check-architecture.sh scripts/build-all.sh scripts/build-release.sh
   chmod +x scripts/build-core.sh scripts/build-claude-module.sh scripts/build-codex-module.sh scripts/build-gemini-module.sh scripts/build-ui-bundle.sh scripts/build-cef-launcher.sh
   ```

## 6. Структура проекта и служебные каталоги
Создайте основную структуру каталогов, чтобы архитектурный скрипт не ругался на отсутствие `src/`:
```bash
mkdir -p src/core src/extension-module src/client/ui/src src/types media
```

## 7. Настройка `.gitignore`
Добавьте итоговый `.gitignore` (примерный набор):
```text
node_modules/
dist/
out/
.DS_Store
npm-debug.log*
*.tgz
.lefthook/
coverage/
tmp/
```
При необходимости расширьте список (например, `media/webview/` если будете хранить сборку отдельно).

## 8. Обновление `package.json`
В раздел `scripts` добавьте команды:
```jsonc
{
  "scripts": {
    "check:architecture": "./scripts/check-architecture.sh",
    "lint": "echo \"lint script not configured yet\"",
    "check:tsprune": "ts-prune",
    "check:dup": "jscpd --threshold 3 --silent --reporters console src --ignore \"**/node_modules/**\"",
    "check:links": "bash -lc 'set -e; if command -v markdown-link-check >/dev/null; then find doc -name \"*.md\" -print0 | xargs -0 -n1 markdown-link-check -q; fi'",
    "quality": "npm run check:architecture && npm run lint && npm run check:tsprune",
    "setup:hooks": "npx husky install"
  }
}
```
Также убедитесь, что в `devDependencies` присутствуют пакеты `@biomejs/biome`, `ultracite`, `husky`, `jscpd`, `ts-prune`, `markdown-link-check` (если `npm install` ещё не добавил их автоматически).

## 9. Настройка Husky‑хуков
Husky использует файлы в `.husky/` в качестве источника Git‑хуков. Для воспроизведения текущей схемы гейтов:

- `.husky/pre-commit` должен вызывать:
  - `npm test`;
  - `./scripts/check-architecture.sh`;
  - `npm run lint`;
  - `npm run check:tsprune`;
  - затем `npx ultracite fix` по staged‑файлам (со стэшем/рестейджем).
- `.husky/pre-push` должен вызывать:
  - `npm run -s check:dup`;
  - `npm run -s check:links`.

В основном репозитории CodeAI-Hub эти файлы уже настроены; для новых проектов их можно скопировать и адаптировать под свою структуру.

## 10. Активация Lefthook и первичная проверка
1. Установите git-хуки:
   ```bash
   npm run setup:hooks
   ```
2. Выполните архитектурный чек вручную:
   ```bash
   npm run check:architecture
   ```
3. Запустите линтер и дополнительные проверки:
   ```bash
   npm run lint
   npm run check:tsprune
   npm run check:dup
   npm run check:links
   ```
4. Убедитесь, что `git commit` и `git push` проходят гейты pre-commit / pre-push без ошибок (Husky будет запускать их автоматически).

## 11. Финальная фиксация
1. Добавьте все файлы в Git и создайте коммит:
   ```bash
   git add .
   git commit -m "chore: bootstrap quality gates"
   ```
2. Оформите отчёт сессии (`doc/Sessions/SessionXXX.md`), чтобы зафиксировать выполненные шаги.

## 12. Проверка перед дальнейшей разработкой
- Запланируйте регулярный запуск `npm run quality` перед началом работы над новой задачей.
- Перед отпуском или релизом выполните `./scripts/build-release.sh <версия>` — в скрипте уже есть чек архитектуры, сборка и упаковка VSIX.

## 13. Дополнительные гейты для автономного ядра

Если проект использует архитектуру Autonomous Core (см. `doc/AutonomousCore_Architecture.md`), перед релизом нужно дополнительно подтвердить корректную работу автономного ядра и клиентов.

1. **Проверка документации и плана.**
   - Убедитесь, что:
     - `doc/AutonomousCore_Architecture.md` описывает текущую реализацию (Core Orchestrator, Core Supervisor, TTL, статусы провайдеров);
     - `doc/TODO/todo-plan.md` отражает актуальный статус фаз, связанных с Autonomous Core (особенно Phase 2–6).

2. **Проверка Core Supervisor и автономного старта ядра.**
   - Запустите ядро через Core Supervisor/CLI (без запуска VS Code и лаунчера) и проверьте:
     - команда `start` поднимает ядро, используя артефакты в `~/.codeai-hub/core/**` и `~/.codeai-hub/providers/**`;
     - команда `status` возвращает состояние `running/ready` и список провайдеров;
     - команда `stop` выполняет корректное завершение ядра.

3. **Проверка attach-only поведения клиентов.**
   - Для VS Code extension:
     - запустите ядро через Supervisor;
     - откройте VS Code с установленным расширением;
     - убедитесь по логам и поведению, что extension только подключается к уже работающему ядру и не инициирует его перезапуск или установку провайдеров.
   - Для CEF лаунчера:
     - повторите аналогичный сценарий: сначала ядро, затем лаунчер;
     - убедитесь, что лаунчер не пытается перезапускать ядро при потере связи, а лишь отображает состояние/ошибки.

4. **Проверка TTL и восстановления сессий.**
   - При живом ядре:
     - перезапустите VS Code и проверьте, что сессии и история восстанавливаются, а ядро не перезапускается;
     - перезапустите лаунчер и убедитесь, что сессии продолжаются.
   - Если используется TTL:
     - убедитесь, что ядро корректно отражает время до auto-shutdown в статусе;
     - убедитесь, что после auto-shutdown клиенты корректно показывают, что ядро недоступно, и могут инициировать новый старт через Supervisor.

5. **Проверка статусов провайдеров.**
   - Отключите/испортите один из провайдеров (например, удалите CLI или сломайте конфигурацию) и убедитесь, что:
     - ядро продолжает работать;
     - статус проблемного провайдера становится `inactive/degraded`;
     - UI-клиенты отображают его как недоступный для выбора, но не скрывают полностью и предлагают путь к ремонту (через явную команду установки/Repair).

## 14. Троблшутинг
- **Уязвимости после `npm install`** — проверьте `npm audit`; если проблемы в инструментах lint/format, обычно достаточно следить за обновлениями и фиксить во время планового обновления dev-зависимостей.
- **Husky или гейты жалуются на отсутствующий `HEAD`** — это нормально до первого коммита; сделайте начальный коммит, после чего pre-push команды смогут получить ревизию.
- **Архитектурный скрипт ругается на отсутствие файлов** — убедитесь, что директории из шага 6 созданы; при необходимости временно создайте заглушки `.keep` в пустых папках.
- **Ultracite форматирует `.vscode/settings.json`** — просто запустите `npm run format:fix`, чтобы принять форматирование.

Следуя этим шагам, каждый новый проект CodeAI‑Hub стартует с одинаковым набором автоматических quality gate’ов, что упрощает дальнейшую поддержку и интеграцию инструментов непосредственно в расширение.
