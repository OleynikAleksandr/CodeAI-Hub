# Legacy Codex SDK Module Removal

## Problem

Release `1.2.22` ввёл `packages/Codex_AppServer_Module/` как parallel transport replacement для legacy `packages/Codex_Module/` (Codex SDK-based) и переключил Core `provider-registry` на новый модуль. Legacy пакет был оставлен как temporary fallback-only shell. На момент `1.2.37` legacy модуль фактически orphaned:

- Активный код не содержит ни одного `import '@codeai-hub/codex-module'`; провайдер-registry загружает только `@codeai-hub/codex-app-server-module` (`provider-module-loader.ts`).
- Build scripts (`build-all.sh`, `build-codex-module.sh`) берут версию и tarball из `Codex_AppServer_Module`; artifact name `codex-module-<version>.tar.bz2` стабилен и продолжает генериться app-server-модулем.
- `.vscodeignore:47` уже исключает legacy пакет из VSIX.
- Никакой runtime fallback от app-server к legacy не существует.

Legacy пакет остаётся в репозитории как ~60 TypeScript-файлов мёртвого кода плюс lockfile-запись `@codeai-hub/codex-module` и transitive `@openai/codex-sdk@0.53.0`, которые не нужны ни тестам, ни runtime.

## Solution

1. Физически удалить `packages/Codex_Module/` и все его артефакты:
   - `git rm -r packages/Codex_Module/` (~60 `.ts` + dist + node_modules).
   - Убрать запись `"packages/Codex_Module"` из `knip.json` workspaces (строки 20-21); иначе pre-commit knip падает.
   - Убрать запись `packages/Codex_Module/**` из `.vscodeignore:47` — запись становится мёртвой после удаления директории.
   - Перегенерировать `package-lock.json` через `npm install`; это вычистит `@codeai-hub/codex-module`, `@openai/codex-sdk@0.53.0` и legacy-only transitive deps.

2. Активные SSOT-документы — убрать formulations вида «legacy fallback-only» и обновить пути, которые указывают в удалённый пакет:
   - `Modules/Codex.md` (3 места): legacy package bullet, stable-artifact-name bullet, release packaging bullet — переформулировать так, что app-server это единственная canonical линия, а stable artifact name остаётся product contract'ом.
   - `System/SystemArchitecture.md` строка 173: упростить provider-modules bullet, убрать parenthetical про legacy.
   - `Contracts/Formal_Module_Cluster_Facade_Architecture.md` строка 428: в mermaid-диаграмме `packages/Claude_Module|Codex_Module|Gemini_Module/src/*` заменить `Codex_Module` на `Codex_AppServer_Module`.
   - `Contracts/ProviderFailure_Recovery_And_ProviderSwitch.md` строка 107: путь `packages/Codex_Module/src/sdk/codex-sdk-manager.ts` заменить на app-server эквивалент (например, `packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.ts`), убедившись, что обновлённый путь реально держит закрепляемый за строкой invariant.
   - `Contracts/EffectiveModelIdentity_And_Settings_SSOT.md` строка 139: путь `packages/Codex_Module/src/messaging/codex-applied-turn-config.ts` заменить на app-server эквивалент (`packages/Codex_AppServer_Module/src/provider/codex-provider-adapter.ts` — точный файл уточняется при правке).

3. Не трогать historical материал: `CHANGELOG.md`, `doc/TODO/Archive/`, `doc/SolidWorks-WorkFlow/Plans/Archive/`, `doc/Sessions/`, `doc/BugRegistry.md`. Эти упоминания — аудит-trail, их сохранение важно для регрессионных расследований.

4. Не трогать `Plans/Codex_SDK_vs_AppServer_Capabilities_Analysis.md`: этот research-doc обсуждает публичный OpenAI `@openai/codex-sdk` как концепт, а не наш internal пакет.

## Out of Scope

- Изменения provider contract: внешний `codexCli` provider id, provider-home slot `~/.codeai-hub/providers/codex`, installer artefact name `codex-module-<version>.tar.bz2` — остаются неизменными.
- Build scripts: `build-all.sh`, `build-codex-module.sh`, `build-release.sh` уже работают с app-server-модулем как с single-source-of-truth для Codex line; правки не нужны.
- Core `provider-registry`, `provider-installer-paths`, `provider-module-loader`: уже чистые, в них нет legacy-упоминаний.
- Transitive cleanup других provider-модулей: Claude / Gemini линии этот scope не трогает.

## Risks and Mitigations

- knip.json workspaces + `packages/Codex_Module` — если директория удалена без правки knip, pre-commit падает. Mitigation: правка knip.json входит в тот же commit, что и `git rm -r`.
- package-lock.json drift — после удаления пакета lockfile обновится через `npm install`; fresh lockfile коммитится вместе с `git rm`. Husky pre-commit гоняет lint/knip/dup; если lockfile не пересобран, npm-based scripts могут ломаться на CI. Mitigation: `npm install` перед commit.
- VSIX package content — `.vscodeignore` удаляет мёртвую строку, но это только cosmetic; VSIX и сейчас не содержит legacy-модуль.
- Release packaging — `codex-module-<version>.tar.bz2` tarball продолжит собираться app-server-модулем; installer flow не меняется.

## Canonical Document Landing

После закрытия cycle planning-doc архивируется в `doc/SolidWorks-WorkFlow/Plans/Archive/`. Canonical SSOT для Codex line остаётся `doc/SolidWorks-WorkFlow/Modules/Codex.md` с обновлённым языком (single active implementation). В `System/SystemArchitecture.md` §4 provider-modules bullet упрощается.
