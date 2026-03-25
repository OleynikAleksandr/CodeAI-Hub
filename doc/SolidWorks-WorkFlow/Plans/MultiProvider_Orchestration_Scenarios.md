# Multi-Provider Orchestration: сценарии совместной работы провайдеров в одном Workspace

**Status:** Draft / Discussion
**Created:** 2026-03-25
**Owner:** Oleksandr
**Scope:** Архитектурное видение — как Core Orchestrator может использовать несколько AI-провайдеров одновременно для повышения качества артефактов

---

## 1. Контекст и мотивация

### Наблюдение из сравнительного теста (Session 158)

Три провайдера показали разные сильные стороны на одних и тех же шагах workflow:

| Провайдер | Сильная сторона | Слабая сторона |
|-----------|----------------|----------------|
| **Claude** | Архитектурная точность, domain expertise, правильные решения о кластеризации, глоссарий | Требует чуть больше уточнений на ранних этапах |
| **GPT 5.4** | Narrative quality, глубина рассуждений, continuity-понимание, richness of text | Требует больше user input на Diagram Modules |
| **Gemini Flash** | Скорость, быстрый структурный каркас, промежуточные сообщения | Пропускает ключевые нюансы (continuity, downstream sync) |

**Вывод:** ни один провайдер не является лучшим во всём. Максимальное качество достижимо через комбинирование их сильных сторон.

### Текущее ограничение

Сейчас пользователь выбирает **одного** провайдера для workspace и работает только с ним. Чтобы сравнить результаты, нужно создавать отдельные workspace и проходить workflow заново — это непрактично для production use.

### Цель

Спроектировать сценарии, в которых Core Orchestrator использует несколько провайдеров **в рамках одного workspace** для создания одного максимально качественного артефакта на каждом шаге.

---

## 2. Архитектурные предпосылки

### Что уже есть в системе

- Core Orchestrator знает обо всех подключённых провайдерах и может создавать сессии с каждым
- Провайдеры изолированы (peer-модули с общим lifecycle-контрактом)
- Каждый шаг workflow производит один канонический артефакт (Markdown SSOT)
- Core управляет turn lifecycle и может параллельно вести несколько provider-сессий
- User-facing dialog в PM — это unified layer поверх provider-сессий

### Что нужно добавить (общее для всех сценариев)

- **Multi-provider session group**: Core создаёт группу из N provider-сессий для одного шага
- **Merge/synthesis logic**: механизм объединения результатов нескольких провайдеров в один артефакт
- **Routing decision engine**: логика выбора, какому провайдеру какую роль отдать
- **Cost/latency budget**: пользователь задаёт ограничения (время, токены, деньги)

---

## 3. Сценарии

### Сценарий A: Parallel Draft + Best-of-N Selection

**Идея:** Все провайдеры получают одно и то же задание параллельно. Core собирает N черновиков. Пользователь (или designated provider) выбирает лучший и дорабатывает его.

```
User submits questionnaire
        │
        ├──→ Claude session  ──→ Draft A (Final_Description_claude.md)
        ├──→ GPT 5.4 session ──→ Draft B (Final_Description_codex.md)
        └──→ Gemini session  ──→ Draft C (Final_Description_gemini.md)
                                        │
                                        ▼
                              Core presents all 3 drafts
                              User picks best → becomes SSOT
                              User refines with chosen provider
```

**UX в Project Manager:**
- В панели артефактов — три вкладки с черновиками
- Кнопка "Принять как основу" у каждого черновика
- После выбора — обычный dialog с одним провайдером для доработки

**Плюсы:**
- Простая реализация (3 параллельных одинаковых сессии)
- Пользователь видит разницу и делает осознанный выбор
- Не требует merge-логики

**Минусы:**
- 3x стоимость первого turn
- Пользователь должен читать 3 документа
- Не использует синергию — просто выбор лучшего

**Сложность реализации:** Низкая

---

### Сценарий B: Pipeline (Draft → Review → Finalize)

**Идея:** Провайдеры работают последовательно, каждый в своей роли. Один создаёт черновик, второй рецензирует и дополняет, третий финализирует.

```
Step 1: GPT 5.4 (narrative strength)
        │
        └──→ Creates rich Draft v1
                │
Step 2: Claude (architectural precision)
        │
        └──→ Reviews Draft v1
             Adds: boundaries, glossary, architectural corrections
             Produces Draft v2
                │
Step 3: Gemini Flash (speed, structure)
        │
        └──→ Final structural pass
             Validates format compliance
             Produces Final_Description.md (SSOT)
```

**UX в Project Manager:**
- Пользователь видит прогресс: "Draft → Review → Finalize"
- В dialog panel — сообщения от разных провайдеров (разные аватары/цвета)
- Пользователь может вмешаться между этапами

**Роли по шагам workflow:**

| Шаг workflow | Drafter (создатель) | Reviewer (рецензент) | Finalizer |
|-------------|--------------------|--------------------|-----------|
| Description | GPT 5.4 (narrative) | Claude (architecture) | Gemini (format) |
| Virtual Simulation | GPT 5.4 (scenarios depth) | Claude (boundaries) | Gemini (structure) |
| Diagram Modules | Claude (clustering decisions) | GPT 5.4 (naming, relations) | Gemini (format validation) |

**Плюсы:**
- Каждый провайдер делает то, что умеет лучше всего
- Результат проходит "peer review" другим AI
- Pipeline можно настраивать (менять роли, убирать этапы)

**Минусы:**
- Последовательная latency (3 turn-а вместо 1)
- Reviewer может не понять контекст Drafter
- Нужен prompt engineering для каждой роли

**Сложность реализации:** Средняя

---

### Сценарий C: Parallel + Synthesis (Merge Agent)

**Идея:** Все провайдеры работают параллельно, как в Сценарии A. Но вместо ручного выбора, designated "synthesis provider" получает все черновики и создаёт один объединённый документ, взяв лучшее из каждого.

```
User submits questionnaire
        │
        ├──→ Claude session  ──→ Draft A
        ├──→ GPT 5.4 session ──→ Draft B
        └──→ Gemini session  ──→ Draft C
                                    │
                                    ▼
                    Synthesis turn (Claude or GPT 5.4):
                    "Вот 3 черновика одного документа.
                     Создай один финальный, взяв лучшее из каждого:
                     - архитектурную точность из Draft A
                     - narrative глубину из Draft B
                     - структурную ясность из Draft C"
                                    │
                                    ▼
                          Final_Description.md (SSOT)
```

**UX в Project Manager:**
- Прогресс: "Generating drafts... [3/3]" → "Synthesizing..." → "Done"
- Пользователь может открыть промежуточные черновики (read-only)
- Dialog показывает synthesis turn с финальным результатом

**Плюсы:**
- Автоматический merge — пользователь не читает 3 документа
- Synthesis provider видит все перспективы и выбирает лучшее
- Максимальное качество при минимальном user effort

**Минусы:**
- Высокая стоимость (3 drafts + 1 synthesis turn с 3 документами в context)
- Synthesis provider может потерять нюансы при merge
- Большой context window нужен для synthesis

**Сложность реализации:** Средняя

---

### Сценарий D: Adaptive Specialist Routing

**Идея:** Core анализирует тип задачи внутри шага и маршрутизирует к провайдеру-специалисту. Не параллельно и не pipeline — а умный routing.

```
User message: "Опиши архитектурные границы системы"
        │
        └──→ Core classification: "architecture/boundaries"
             └──→ Route to Claude (best at boundaries)

User message: "Расширь сценарий continuity"
        │
        └──→ Core classification: "scenario/narrative"
             └──→ Route to GPT 5.4 (best at narrative)

User message: "Быстро проверь формат таблиц"
        │
        └──→ Core classification: "format/validation"
             └──→ Route to Gemini Flash (fastest)
```

**Как определяются специализации:**
- Hardcoded таблица specialization по категориям задач (MVP)
- Или: lightweight classifier (Gemini Flash) анализирует user message и выбирает маршрут

**UX в Project Manager:**
- Пользователь видит, какой провайдер отвечает (аватар/бейдж)
- Переключение прозрачно — один непрерывный dialog
- В настройках: таблица "задача → провайдер" (настраиваемая)

**Плюсы:**
- Оптимальное использование каждого провайдера
- Пользователь не думает о выборе — система решает
- Можно оптимизировать по cost (Flash для простых, Pro для сложных)

**Минусы:**
- Сложная classification логика
- Context не переносится между провайдерами (разные сессии)
- Пользователь может не понимать, почему "агент вдруг стал другим"

**Сложность реализации:** Высокая

---

### Сценарий E: Consensus Review (Голосование)

**Идея:** Один провайдер создаёт артефакт. Core отправляет его **всем остальным** на review. Каждый возвращает список замечаний. Core собирает все замечания и отдаёт автору для финального исправления.

```
Step 1: Claude creates Final_Description.md
                │
Step 2: Core sends artifact to reviewers
        ├──→ GPT 5.4: "3 замечания: [continuity недостаточно описан, ...]"
        └──→ Gemini:   "2 замечания: [нет границы PM↔Core, ...]"
                │
Step 3: Core merges review comments (deduplicate)
        └──→ Claude: "Вот замечания от двух рецензентов: [...].
                      Обнови артефакт, учитывая эти замечания."
                │
                ▼
        Updated Final_Description.md (SSOT)
```

**UX в Project Manager:**
- После первого draft: "Reviewing with other providers..."
- Панель замечаний (как code review): список issues от каждого reviewer
- Пользователь может одобрить/отклонить каждое замечание перед отправкой автору
- Или: auto-accept all → автор исправляет сразу

**Плюсы:**
- Минимальное изменение текущей архитектуры (один автор, review — это просто дополнительные turns)
- Пользователь контролирует, какие замечания принять
- Замечания — это explicit, traceable feedback
- Хорошо масштабируется: можно review одним провайдером, а можно тремя

**Минусы:**
- 3 дополнительных turn-а (review + fix)
- Замечания могут противоречить друг другу
- Автор может "отмахнуться" от замечаний

**Сложность реализации:** Низкая-Средняя

---

### Сценарий F: User Q&A Broadcast

**Идея:** Когда пользователь отвечает на вопрос одного провайдера, Core **дублирует этот ответ во все активные провайдерские сессии** того же шага. Провайдеры работают параллельно, но все получают одинаковый user input.

```
Claude asks: "Как Core взаимодействует с PM?"
User answers: "Через WebSocket, snapshot-first"
        │
        ├──→ Claude session:  receives answer, updates its context
        ├──→ GPT 5.4 session: receives same answer as context enrichment
        └──→ Gemini session:  receives same answer as context enrichment
```

Это можно комбинировать с любым из сценариев A-E.

**Реализация в Core:**
- Hook на user message в turn router
- Broadcast user content to all active sessions of the same workflow step
- Для "тихих" сессий: user message добавляется как system context, не как dialog turn

**Плюсы:**
- Все провайдеры получают одинаковую domain information
- Устраняет проблему "я дал Claude больше info, чем GPT"
- Почти нулевая дополнительная стоимость (только токены user message)

**Минусы:**
- Провайдер может быть confused получением ответа на вопрос, который он не задавал
- Нужна обёртка: "Пользователь уточнил для контекста: ..."

**Сложность реализации:** Низкая

---

## 4. Рекомендуемая стратегия: поэтапное внедрение

### Phase 1 (MVP): Сценарий F (Broadcast) + Сценарий A (Parallel Best-of-N)

Минимальные изменения в архитектуре:
- Core broadcast user answers to all active sessions
- Параллельные drafts на первом turn каждого шага
- Пользователь вручную выбирает лучший draft

**Что менять:**
- `SessionRequestHandler`: broadcast user message to parallel sessions
- PM UI: вкладки drafts + кнопка "Accept as SSOT"
- `GeminiSessionManager` / `ClaudeSessionManager` / `CodexSessionManager`: параллельный запуск

### Phase 2: Сценарий E (Consensus Review)

После Phase 1 пользователь уже умеет работать с multi-draft. Добавляем:
- Review turn: отправка артефакта другим провайдерам на рецензию
- Панель замечаний в PM
- Auto-accept / manual-accept режим

### Phase 3: Сценарий B (Pipeline) + Сценарий D (Adaptive Routing)

Полноценная multi-provider orchestration:
- Настраиваемые pipeline-роли (Drafter → Reviewer → Finalizer)
- Classification engine для adaptive routing
- Cost/latency optimization

---

## 5. Влияние на существующую архитектуру

### Core Runtime

| Компонент | Изменение |
|-----------|----------|
| `turn-router` | Поддержка multi-provider session group, broadcast |
| `session-continuity` | Параллельные chains для N провайдеров одного шага |
| `workflow-state-manager` | Draft selection state, review state |
| Новый: `multi-provider-orchestrator` | Coordination logic: parallel launch, merge, routing |

### Project Manager

| Компонент | Изменение |
|-----------|----------|
| Session panel | Multi-avatar dialog (разные провайдеры в одном потоке) |
| Artifact panel | Draft tabs (Draft A / Draft B / Draft C), Accept button |
| Новый: Review panel | Замечания от reviewer-провайдеров |

### Provider Modules

**Без изменений.** Провайдеры остаются изолированными peer-модулями. Вся orchestration логика — в Core.

---

## 6. Open Questions

1. **Как показать пользователю, что "за кадром" работают 3 провайдера?** Прозрачность vs перегруженность UI.
2. **Как решать конфликты между reviewer-ами?** Если Claude и GPT дают противоречивые замечания.
3. **Budget control**: пользователь хочет ограничить cost. Как Core решает, сколько провайдеров запускать?
4. **Context window management**: при synthesis/review — все черновики должны поместиться в context. Для Description (~300 lines) это ОК, но для Diagram Modules с 4+ product parts?
5. **Continuity**: если один провайдер в pipeline "умер" (capacity error) — как graceful fallback к single-provider?
