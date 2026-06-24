# План удаления провайдера Gemini (Gemini Removal Planning)

**Создан:** 2026-06-24
**Owner:** CodeAI Hub Bot
**Триггер:** `npm audit` показал 54 уязвимости; основной moderate-кластер (googleapis / google-cloud / gaxios / uuid / @opentelemetry/*) тянется транзитивно через `@google/gemini-cli` / `@google/gemini-cli-core`. Провайдер Gemini не востребован — пользователь решил удалить его полностью.

## 1. Цель

Полностью и аккуратно удалить провайдера Gemini из CodeAI Hub: рабочий код, SDK (`@google/gemini-cli*`), пакет `packages/Gemini_Module`, UI/settings, start-cards, build/installer pipeline и документацию. После удаления — повторный `npm audit`, затем релизная сборка без Gemini для пользовательской проверки.

## 2. Scope удаления

### 2.1 Код — полное удаление
- `packages/Gemini_Module/` (весь пакет)
- `packages/core/src/provider-usage-limits/providers/gemini/`
- `src/types/gemini-model-registry.ts`
- `src/extension-module/settings/gemini-settings.ts`, `gemini-version-reader.ts`
- `src/client/ui/src/components/settings/gemini-default-model/` (каталог), `gemini-mapping.ts`
- `assets/providers/gemini/`
- `scripts/build-gemini-module.sh`

### 2.2 Код — частичные правки (сузить union-типы `geminiCli`/`gemini`, убрать ветки)
- `packages/core`: `provider-registry/*`, `config/*`, `remote-bridge/*`, `provider-usage-limits/*` типы, `index.ts` (abort suppression list)
- `src/client`: settings UI, provider dropdowns, `stage-start-model-selection`, workspace tree provider tint/resolvers
- `src/extension-module/settings`: `provider-version-model/service`, `settings-storage`, `types`

### 2.3 SDK и зависимости
- `@google/gemini-cli`, `@google/gemini-cli-core` (корневой `package.json` + `Gemini_Module`)
- `@codeai-hub/gemini-module` из `packages/core/package.json`

### 2.4 Build / packaging
- `scripts/build-all.sh`, `scripts/build-core.sh`, `scripts/build-release.sh`, `scripts/release-utils.sh`
- `.vscodeignore` (Gemini-специфичные строки)

### 2.5 Документация — полная стерилизация (решение пользователя, 2026-06-24)
- Активные SSOT целиком про Gemini → удалить: `Modules/Gemini.md`, `Contracts/Gemini_ThoughtTranslation.md`
- Живые общие доки → вычистить Gemini: `System/SystemArchitecture.md`, `System/WorkflowSteps_Overview.md`, `Docs_Index.md`, `DesignSystem/CorporateDesign.html`, `README.md`, прочие SSOT с упоминаниями
- Архив (`doc/SolidWorks-WorkFlow/Plans/Archive/`, `doc/TODO/Archive/`) и история `CHANGELOG.md` → вычистить/удалить Gemini-материалы

## 3. Стратегия порядка (чтобы typecheck / knip / lint не падали на промежуточных шагах)

1. UI-потребители (provider-selector, settings-таб, start-card model selection, workspace tree).
2. Extension-module settings (provider-version, settings-storage, types).
3. Core: точки регистрации провайдера → config → remote-bridge → usage-limits.
4. Сузить shared union-типы (`geminiCli`/`gemini`) — в самом конце, когда не осталось потребителей.
5. Удалить `Gemini_Module` + SDK + workspace-зависимость + build-скрипты + `.vscodeignore`.
6. Документация (по scope 2.5).
7. Повторный `npm audit` — зафиксировать снижение уязвимостей.
8. Tooling verification → Release Build (только после явного подтверждения) → User Acceptance → Scope Closeout.

Принцип: удаляем Gemini-файл и его использование в близких задачах, чтобы `knip` не падал на «осиротевших» экспортах. Каждая задача ≤ 3 файлов; план растёт инкрементально.

## 4. Context Pack (читать перед реализацией)
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
- `doc/SolidWorks-WorkFlow/Docs_Index.md`
- `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- `doc/SolidWorks-WorkFlow/Contracts/ProviderFailure_Recovery_And_ProviderSwitch.md`
- `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`

## 5. Acceptance
Scope остаётся ACTIVE до явного пользовательского acceptance после установки релизного VSIX без Gemini.
