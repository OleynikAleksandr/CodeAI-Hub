# CodeAI Hub — нерешённые вопросы (Codex)
**Дата:** 24 октября 2025  
**Версия:** 1.0.43  

---

- `assets/core/manifest.json` — пустые записи (size 0, SHA-1 отсутствует). До выкладки ядра в Releases `ensureCoreInstalled` останется нерабочим.
- `assets/launcher/manifest.json` — поддерживается только `darwin-arm64`. Требуются готовые артефакты и секции для Windows/Linux.
- `src/extension-module/cef/launcher-installer.ts` — 265 строк (зона 250–300). Нужна декомпозиция перед расширением логики.
- Пустые каталоги (осознанные планы): `src/webview`, `packages/core/src/{session-manager,provider-registry,remote-bridge,config,telemetry,orchestrator}`.
- Повторяющаяся установка CEF/Core (`runtime-installer` ↔ `core-installer`, 1.11% дублирования). Стоит вынести общие утилиты.
- `ensureCoreInstalled` не интегрирован в активацию; требуется определить сценарий вызова после появления артефактов.

**Метрики / проверки**
- `npm run lint`, `npm run compile`, `npm run typecheck:webview` — OK.
- `./scripts/check-architecture.sh` — предупреждения по крупному файлу и пустым каталогам.
- `npx ts-prune` — предупреждение на `ensureCoreInstalled` (ожидаемая заглушка).
- `npx jscpd --min-tokens 50 src` — 4 клона (1.11%).
