# Kimi ACP + High Speed Settings — Planning (RU)

**Status:** Active planning source.
**Owner:** Codex
**Created:** 2026-06-21
**Branch:** main
**Base head:** cc61b6ef54f850c957565e5ab8f423e6d84eacc3

## 1. Постановка задачи

После обновления Kimi CLI провайдер `kimiCode` перестал создавать сессию:
CodeAI запускает старый Wire-процесс через `spawn kimi ... --wire`, а новый
локальный CLI установлен как `~/.kimi-code/bin/kimi` и работает через ACP
команду `kimi acp`. В результате UI видит провайдера после перезапуска Core,
но первая попытка создания сессии ломается, а следующая показывает
`spawn kimi ENOENT` / `Failed to create kimiCode session`.

Параллельно нужно обновить модельные поверхности:
- убрать из Settings переключатель включения/выключения Kimi reasoning;
- оставить visibility-настройку `Reasoning in dialog`, потому что она управляет
  только отображением think-сообщений в UI;
- добавить модель `kimi-k2.7-code-highspeed`;
- показать High Speed в карточке провайдера на workflow step;
- показать High Speed в выборе модели статус-лайна сессии.

## 2. Фактический baseline

Проверка локального CLI на 2026-06-21:
- binary: `/Users/oleksandroliinyk/.kimi-code/bin/kimi`;
- version: `Kimi Code CLI 0.18.0`;
- managed entrypoint: `kimi acp`;
- ACP `initialize` отвечает `protocolVersion: 1`, `agentInfo.name: Kimi Code CLI`;
- `session/new` до пользовательского login возвращает корректную ACP-ошибку
  `Authentication required`, а не `ENOENT` и не Wire startup failure.

Вывод: новый managed path должен запускать именно ACP stdio server. Старые
флаги `--wire`, `--config-file`, `--agent-file`, `--mcp-config-file`,
`--skills-dir`, `--thinking`, `--no-thinking`, `--work-dir` больше нельзя
считать рабочим контрактом для CodeAI-managed Kimi.

## 3. Решение

### 3.1. Runtime

Минимальный путь:
- resolver CLI должен искать `~/.kimi-code/bin/kimi` до generic `PATH`;
- process bridge запускает `kimi acp` без добавления `--wire`;
- lifecycle делает ACP `initialize`, `session/new`, `session/prompt`,
  `session/cancel`, `session/resume`;
- router принимает обычные JSON-RPC ACP notifications/requests, а не только
  legacy Wire methods `event` и `request`;
- normalizer мапит `session/update` на существующие CodeAI stream events.

Если пользователь не залогинен в новом Kimi CLI, provider должен быть
технически доступен, но creation/send должен вернуть понятную auth-ошибку от
ACP. Это лучше текущего `spawn kimi ENOENT`, потому что проблема становится
аутентификацией, а не отсутствующим binary.

### 3.2. Reasoning

Для моделей Kimi K2.7 и High Speed reasoning считается provider-owned и
always-on. CodeAI больше не показывает binary on/off и не пытается прокидывать
старые CLI thinking flags. Историческое поле settings
`providers.kimi.thinkingEnabled` можно оставить только как backward-compatible
no-op/normalized true, чтобы старые settings snapshot не ломали загрузку.

### 3.3. Model surfaces

Единый model id для новой модели: `kimi-k2.7-code-highspeed`.

Обновляем только активные user-facing поверхности:
- Kimi runtime capability registry;
- shared UI Kimi model registry;
- Settings карточка Kimi;
- workflow step start-card model selector;
- session status-line model picker.

OpenCode provider остается отдельным путем: он использует свой model selector
внутри OpenCode и не заменяет native Kimi ACP provider.

## 4. Scope / Non-scope

In scope:
- repair native Kimi provider startup from old Wire CLI path to ACP;
- High Speed in Settings, step start-card, status model picker;
- remove Kimi reasoning on/off from Settings and step provider-card;
- sync SSOT docs and targeted tests.

Out of scope:
- release build / VSIX packaging without a separate user confirmation gate;
- generic provider restart framework;
- new Kimi auth UI;
- reworking Kimi usage limit reader if auth token format changed.

## 5. Риски

1. ACP auth state may live under `~/.kimi-code`, while historical CodeAI usage
   docs mention `~/.kimi/config.toml`. The fix must not fake readiness: if ACP
   says auth is missing, surface that error.
2. ACP `session/set_config_option` model values may differ between CLI
   versions. The implementation should keep default model startup simple and
   only apply explicit High Speed selection where supported.
3. Existing legacy materialized Kimi agent/profile files may become unused.
   Do not delete them in this scope unless they block ACP startup.

## 6. DoD

- Kimi provider no longer appends `--wire` and no longer depends on PATH-only
  `kimi` lookup when `~/.kimi-code/bin/kimi` exists.
- Settings Kimi card has no reasoning on/off checkbox.
- `kimi-k2.7-code-highspeed` appears in Settings, workflow step provider card,
  and session status model picker.
- Kimi launch-card settings persist model selection without writing
  `thinkingEnabled`.
- Targeted tests cover model registry alignment, launch-card behavior, ACP
  CLI args/process routing, and ACP stream normalization.
- Docs `Modules/Kimi.md`, effective model/settings contract, and session
  status panel module doc match the new behavior.
