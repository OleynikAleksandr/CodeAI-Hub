# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стрим), в каждом Stream — набор микро‑задач.
- Каждая микро‑задача должна затрагивать не более 3 файлов.
- Каждая микро‑задача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- После выполнения каждой микро‑задачи прогоняется Гейт Качества:
  - `./scripts/check-architecture.sh`
  - `npx ultracite check`
  - `npx ts-prune`
  - `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`
  - `npm run check:links`
  - затем таргетная сборка (минимально необходимая для затронутого пакета/клиента)
- Коммит делаем только после зелёных гейтов. После коммита сразу обновляем этот файл (статус/дата/хеш).
- Phase завершается на чистом дереве.

---

## Phase 9 — Release v1.1.399 (owner: Oleksandr, updated: 2026-01-10)

### Stream: Release build

1. [DONE] Выполнить release build v1.1.399 (build-all, обновлённые манифесты/версии; scope: auto-generated release manifests + `package.json`/`package-lock.json`; commit: `feat: v1.1.399 - release build`) (date: 2026-01-10)
2. [DONE] Git Commit: `feat: v1.1.399 - release build` (hash: a99d3af6) (date: 2026-01-10)
3. [DONE] Обновить launcher manifest под v1.1.399 (scope: `assets/launcher/manifest.json`; commit: `fix: update launcher manifest for v1.1.399`) (date: 2026-01-10)
4. [DONE] Git Commit: `fix: update launcher manifest for v1.1.399` (hash: cd94ab7e) (date: 2026-01-10)
