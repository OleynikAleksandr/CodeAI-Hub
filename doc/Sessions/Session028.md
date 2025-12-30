# Session 028 — Универсальный контракт Idea Collector и релиз 1.1.367

**Date:** 2025-12-30 17:55 (CET)
**Branch:** main
**Version:** 1.1.367

---

# 1. Work Done in This Session

## Work summary
- Реализован Core контракт Idea Collector с endpoint `/api/v1/orchestrator/idea-contract` и обновлением архитектурной документации.
- Универсализированы шаблон/схема/промпт Idea Collector, добавлен `idea_type` и запрет длинных документов в диалоге.
- UI переведён на контракт из Core, обновлены fallback schema/prompt.
- Обновлены README/CHANGELOG/SystemArchitecture/Architecture и собран релиз 1.1.367 (build-all + build-release).

## Git commits
- `af3c91c feat(core): sync idea contract at startup`
- `9b4b326 docs: update todo plan for W6.A.1`
- `9ae16b7 docs(orchestrator): define universal idea interview contract`
- `8f409a3 docs: update todo plan for W6.A.2`
- `91985da docs: update todo plan for W6.A.3`
- `a33ef1a docs: update todo plan for W6.A.4`
- `c6283ce docs: update todo plan for W6.A.5-6`
- `a52c4e0 fix(ui): sync idea collector fallbacks`
- `6879921 docs: update todo plan for W6.A.7`
- `da49866 feat(ui): load idea collector contract from core`
- `b93783c docs: update todo plan for W6.A.8`
- `a9d112f docs: prepare 1.1.367 release notes`
- `bfbf22d chore: build 1.1.367 artifacts`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Architecture/Architecture.md`
2. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session028.md` (THIS REPORT)

## Plans for next session
- Проверить полный Idea Collector flow в UI с Core контрактом.
- Обновить отчёт по релизу (VSIX + артефакты) при необходимости.
