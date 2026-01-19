# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стримов) с микрозадачами.
- Каждая микрозадача затрагивает **≤ 3 файла**.
- Каждая микрозадача оформляется парой пунктов: (1) изменения, (2) `Git Commit: ...` отдельной строкой.
- **Gates** после каждой микрозадачи: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка (по затронутым пакетам).
- **Commit** — только после зелёных гейтов.
- **Real-time Docs**: любые изменения протоколов/архитектуры требуют синхронного обновления документов из `doc/` **до** коммита.

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/TODO/todo-plan.md`

---

## Phase 61 — Add Gemini to Idea Collector provider picker (owner: Oleksandr, updated: 2026-01-19)

Цель: добавить Gemini в список провайдеров при отправке анкеты (Idea Collector), чтобы пользователь мог выбрать Gemini наряду с Claude и Codex.

### Stream: Provider picker — add Gemini support
1. [DONE] Feat(project-manager): добавить `geminiCli` в `IDEA_PROVIDER_IDS` и обновить текст диалога — scope: `src/client/project-manager/services/provider-snapshot.ts`, `src/client/project-manager/components/description/idea-collector-provider-picker.tsx`; expected commit message: `feat(project-manager): add gemini to idea collector providers`
2. [DONE] Git Commit: `feat(project-manager): add gemini to idea collector providers` (hash: d145695d)

### Stream: Verification — test Gemini with agents
1. [TODO] Test(manual): проверить, что Gemini корректно получает настройки из `packages/agents/` и отрабатывает workflow — scope: `doc/Sessions/Session010.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: verify gemini idea collector integration`
2. [TODO] Git Commit: `docs: verify gemini idea collector integration` (hash: TBD)

---

## Анализ кода (для контекста)

### Ключевые файлы:
| Файл | Назначение |
|------|------------|
| `src/client/project-manager/services/provider-snapshot.ts:18-21` | **IDEA_PROVIDER_IDS** — whitelist провайдеров (сейчас только Claude, Codex) |
| `src/client/project-manager/components/description/idea-collector-provider-picker.tsx:70-74` | Текст диалога "Claude и Codex" |
| `src/types/provider.ts:1,11-23` | Типы и названия провайдеров (Gemini уже есть) |

### Что нужно изменить:
1. **provider-snapshot.ts** — добавить `"geminiCli"` в `IDEA_PROVIDER_IDS`
2. **idea-collector-provider-picker.tsx** — обновить текст "Claude и Codex" → "Claude, Codex и Gemini"
