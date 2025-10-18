# Quality Gate Manager — Project Bootstrap Guide

Документ описывает полный цикл запуска нового проекта CodeAI‑Hub «с нуля», чтобы сразу включить автоматические гейты качества: Ultracite (Biome), архитектурный скрипт, Lefthook, дублирование и проверку ссылок. Следуя шагам, можно разворачивать рабочее окружение без дополнительного контекста.

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
1. Запустите мастер установки Ultracite (добавит `biome.jsonc`, `.vscode/settings.json`, `lefthook.yml`):
   ```bash
   npx ultracite init --pm npm --editors vscode --rules claude codex --integrations lefthook
   ```
   > Если нужны другие AI-правила или интеграции, перечислите их через пробел (`--rules cursor windsorf`, `--integrations husky`).
2. Проверьте, что созданы файлы: `.vscode/settings.json`, `biome.jsonc`, `lefthook.yml`, `package-lock.json` и установлен dev-зависимости (`ultracite`, `@biomejs/biome`, `lefthook`).

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
   chmod +x scripts/check-architecture.sh scripts/build-release.sh
   chmod -R +x scripts/githooks
   ```

## 6. Структура проекта и служебные каталоги
Создайте основную структуру каталогов, чтобы архитектурный скрипт не ругался на отсутствие `src/`:
```bash
mkdir -p src/core src/extension-module src/webview/ui/src src/types media
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
    "lint": "npx ultracite check",
    "format:fix": "npx ultracite fix",
    "format:check": "npx ultracite check",
    "check:tsprune": "ts-prune",
    "check:dup": "jscpd --threshold 3 --silent --reporters console src --ignore \"**/node_modules/**\"",
    "check:links": "bash -lc 'set -e; if command -v markdown-link-check >/dev/null; then find doc -name \"*.md\" -print0 | xargs -0 -n1 markdown-link-check -q; fi'",
    "quality": "npm run check:architecture && npm run lint",
    "setup:hooks": "npx lefthook install"
  }
}
```
Также убедитесь, что в `devDependencies` присутствуют пакеты `@biomejs/biome`, `ultracite`, `lefthook`, `jscpd`, `ts-prune`, `markdown-link-check` (если `npm install` ещё не добавил их автоматически).

## 9. Обновление `lefthook.yml`
Замените содержимое файла на конфигурацию, которая вызывала гейты в текущем проекте:
```yaml
pre-commit:
  parallel: false
  commands:
    ultracite_fix:
      run: npx ultracite fix
      stage_fixed: true
    architecture:
      run: ./scripts/check-architecture.sh
    lint:
      run: npm run lint
    tsprune:
      run: npm run check:tsprune

pre-push:
  commands:
    duplication:
      run: npm run check:dup
    links:
      run: npm run check:links
```

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
4. Убедитесь, что `npx lefthook run pre-commit` и `npx lefthook run pre-push` выполняются без ошибок.

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

## 13. Троблшутинг
- **Уязвимости после `npm install`** — проверьте `npm audit`; если проблемы в инструментах lint/format, обычно достаточно следить за обновлениями и фиксить во время планового обновления dev-зависимостей.
- **Lefthook жалуется на отсутствующий `HEAD`** — это нормально до первого коммита; сделайте начальный коммит, после чего pre-push команды смогут получить ревизию.
- **Архитектурный скрипт ругается на отсутствие файлов** — убедитесь, что директории из шага 6 созданы; при необходимости временно создайте заглушки `.keep` в пустых папках.
- **Ultracite форматирует `.vscode/settings.json`** — просто запустите `npm run format:fix`, чтобы принять форматирование.

Следуя этим шагам, каждый новый проект CodeAI‑Hub стартует с одинаковым набором автоматических quality gate’ов, что упрощает дальнейшую поддержку и интеграцию инструментов непосредственно в расширение.
