- Ultracite — это жёстко настроенный пресет поверх Biome (Rust‑линтер + форматтер), который ставится одной командой npx ultracite init, создаёт biome.jsonc, настраивает VS Code (formatOnSave, source.fixAll.biome, organizeImports) и при необходимости подключает автоматизации вроде lefthook/lint‑staged/husky.
- CLI (npx ultracite check|fix|doctor) и on‑save действия закрывают форматирование, автофиксы lint‑правил, сортировку импортов, строгую типобезопасность и A11y/React/Next.js рекомендации; все правила видно в biome.jsonc из репозитория.
- Триггеры без участия разработчика:
• on‑save в редакторе (Biome extension) — мгновенный формат и фиксы;
• pre-commit pre-push через lefthook/husky/lint-staged — npx ultracite fix/check по staged или всей базе;
• CI шаги (например, ultracite check + doctor) для гарантии на ветках и PR;
• дополнительные интеграции (MCP, monorepo) уже описаны в их доках.
- Расширение правил: Biome допускает собственный biome.jsonc с overrides (linter.rules.*) и отключением/усилением конкретных чеков, но кастомных архитектурных ограничений “из коробки” нет, поэтому их нужно дополнять скриптами (TS/Node) или утилитами (madge, dependency-cruiser и т.п.), которые можно вшить в те же триггеры lefthook/CI рядом с Ultracite.