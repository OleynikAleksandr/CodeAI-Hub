# План разработки (Development TODO Plan)

## Phase 1 — Multi-Workspace Core Foundation (owner: Gemini, updated: 2025-12-25) [DONE]

---

## Phase 2 — Project Manager UI & API (owner: Gemini, updated: 2025-12-25) [DONE]

---

## Phase 3 — Tech Debt & Refactoring (owner: Gemini, updated: 2025-12-25) [DONE]

### Stream 1: RemoteBridge Decomposition [DONE]
1. [DONE] Рефакторинг `RemoteBridge`: вынести логику проектов и системных роутов в отдельные хендлеры.
2. [DONE] Git Commit: `refactor(core): extract ProjectRequestHandler and SystemRequestHandler from RemoteBridge`
3. [DONE] Рефакторинг `RemoteBridge`: вынести логику сессий, HTTP роутинг и WebSocket управление в отдельные модули.
4. [DONE] Git Commit: `refactor(core): complete RemoteBridge decomposition into handlers`

---

## Phase 4 — Final Polish & Release (owner: Gemini, updated: 2025-12-25)
1. [DONE] Актуализировать CHANGELOG.md и Architecture.md.
2. [TODO] Собрать все компоненты через `./scripts/build-all.sh`.
3. [TODO] Собрать VSIX через `./scripts/build-release.sh --use-current-version`.
4. [TODO] Проверить работоспособность релиза.