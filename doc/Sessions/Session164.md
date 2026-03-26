# Session 164 — Dual-Agent Orchestration: Planning Document

**Date:** 2026-03-26 ~21:00 (CET)
**Branch:** main
**Version:** 1.1.818 (без изменений кода)

---

# 1. Work Done in This Session

## Work summary

Сессия целиком посвящена проектированию — кода не писали, версия не менялась.

### Переписан planning-документ `MultiProvider_Orchestration_Scenarios.md`

Исходный документ содержал 6 абстрактных сценариев мульти-провайдерной оркестрации (A–F). На основе ручного тестирования владельцем оставлен **один проверенный сценарий** — "Parallel Dual-Agent with Cross-Pollination".

Ключевые решения, принятые в ходе обсуждения:

1. **Сценарий**: два провайдера работают параллельно, все Q&A транслируются перекрёстно обоим. В конце — перекрёстное review, пользователь выбирает лучший draft.

2. **UX — два таба, а не комбинированный dialog**: обсуждён и отброшен вариант единого потока из-за каши turn-ов и сложной синхронизации. Решение — два отдельных таба сессий в PM, привычный UX.

3. **Буферизованный cross-broadcast**: cross-broadcast Q&A отправляется только вместе с очередным user message (не перебивает агента посреди turn-а). Формат: сначала ответ user-а на вопросы агента, затем блок от Core с накопленным контекстом от другого агента.

4. **Точка входа**: при отправке анкеты — два варианта: "Send" (одному, текущее поведение) или "Send to Both" (dual-agent mode).

5. **Cross-Review**: ручной trigger — кнопка "Start Review". Core автоматически отправляет артефакты перекрёстно.

6. **Decision**: кнопка "Accept as SSOT" фиксирует primary-сессию (`primarySessionId`). Замечания из review копируются вручную в чат primary-агента. Вторая сессия — read-only.

7. **Решённые open questions**: дедупликация вопросов — не автоматизируем (копипаст); fallback — single-agent при падении провайдера; cost — существующий Limit Visibility.

8. **Оставшийся open question**: формат cross-broadcast блока (решим при нарезке todo-plan).

### Feedback от пользователя (зафиксирован в memory)

- Не использовать markdown-таблицы в документах — только строчные/bulleted lists.
- Писать компактно, без воды — документ сокращён в ~4 раза.

## Git commits

- `de84e58a docs(session): record session 164 — dual-agent orchestration planning`

---

# 2. Instructions for Next Session

## Required documents to review before work

1. `AGENTS.md`
2. `doc/Sessions/Session164.md` (THIS REPORT)
3. `doc/SolidWorks-WorkFlow/Plans/MultiProvider_Orchestration_Scenarios.md` — **прочитать полностью**, это основа для следующего шага

## Plans for next session

### Priority 1: Архитектурный документ для Dual-Agent Orchestration
- Компактный документ без рассуждений — только описание классов, контрактов, потоков данных
- На основе решений из `MultiProvider_Orchestration_Scenarios.md`
- Место: `doc/SolidWorks-WorkFlow/System/` или `doc/SolidWorks-WorkFlow/Plans/`

### Priority 2: todo-plan с микрозадачами
- Только после утверждения архитектурного документа пользователем
- Нарезка на Phase/Stream по правилам AGENTS.md

### Backlog (из Session 163)
- Live testing optimistic user message (BUG-05)
- Workflow testing: Virtual Simulation + "Исправить с агентом"

### Known state at end of session
- Branch: `main`
- Version: `1.1.818`
- Два untracked файла в `doc/SolidWorks-WorkFlow/Plans/`
- Код не менялся
