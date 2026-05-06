# Workflow Step Prompt Testing Methodology

**Status:** Active (process)
**Owner:** Oleksandr + Codex
**Updated:** 2026-05-06

## Назначение

Этот документ описывает общий протокол тестирования стартового prompt'а любого workflow step agent.

Цель такого теста не в том, чтобы вручную довести конкретный draft artifact до идеала. Цель в другом: через живой прогон агента увидеть, какие решения он принимает сам, где он начинает гадать, где задаёт лишние вопросы, где преждевременно материализует файлы, и какие недостающие правила нужно перенести в стартовый prompt шага.

Итогом теста должен быть улучшенный step front: входная инструкция, которая заранее направляет агента в правильный алгоритм работы.

## 1. Что такое step front

**Step front** — это весь входной контракт шага до первого действия агента:

- стартовый prompt агента;
- contract/reference template шага;
- список runtime-provided artifacts;
- tool/profile capabilities;
- stage completion boundary;
- правила acceptance;
- machine-readable schema для artifacts;
- запреты на работу вне stage scope.

Если step front слабый, агент будет компенсировать пустоты вопросами к пользователю, догадками или неправильным расширением scope. Если step front сильный, агент сам проходит нужный маршрут и задаёт только финальные вопросы, которые действительно нельзя вывести из входных данных.

## 2. Правильная цель теста

Тестировать нужно не "получился ли хороший artifact", а "правильно ли стартовый prompt управляет поведением агента".

Во время теста нельзя оценивать только финальный Markdown или JSON. Нужно наблюдать весь ход:

- с чего агент начал;
- какие входные artifacts прочитал;
- стал ли он искать внешние источники, если step требует research;
- отделил ли он analysis/design pass от artifact writing;
- не начал ли он materialization раньше времени;
- задавал ли вопросы до того, как сам мог подготовить draft;
- оставил ли acceptance на пользователе;
- остановился ли на границе своего шага.

Хороший тест выявляет дефекты prompt'а раньше, чем они превратятся в дефекты реализации.

## 3. Методика живого прогона

### 3.1 Подготовить минимально реалистичный state

Перед запуском шага нужно создать состояние, максимально похожее на будущую работу пользователя:

- upstream artifacts должны быть достаточно полными, чтобы агент мог принять решения;
- предыдущий step должен быть accepted, если текущий step зависит от него;
- тестовый workspace должен содержать реальные artifact paths;
- ненужные старые artifacts лучше удалить, чтобы не смешивать результаты разных прогонов;
- пользователь не должен заранее подсказывать все решения, которые агент обязан вывести сам.

Тестовый state должен проверять самостоятельность агента, а не только его способность выполнять прямую инструкцию.

### 3.2 Наблюдать reasoning и первые действия

Первые рассуждения агента важнее финального текста. Они показывают, понял ли агент форму задачи.

Для каждого шага нужно смотреть:

- понял ли агент свой stage;
- понял ли входные dependencies;
- выбрал ли правильный первый pass;
- не начал ли с преждевременной записи artifact;
- не пытается ли читать произвольный репозиторий вместо runtime-provided artifacts;
- не игнорирует ли accepted contracts;
- не просит ли пользователя о том, что должен был вывести сам.

Если первые действия неверные, исправлять нужно стартовый prompt, а не спорить с агентом в конкретной сессии.

### 3.3 Дать агенту дойти до draft

В хорошей проверке не нужно прерывать агента на каждом сомнении. Нужно дать ему завершить draft, если он не нарушает stage boundary.

Это позволяет увидеть:

- насколько prompt удерживает агента без промежуточного coaching;
- какие open decisions агент выносит в конец;
- сохраняет ли он draft/accepted boundary;
- насколько machine-readable artifact согласован с human-readable artifact;
- какие ошибки повторяются системно и должны стать правилами prompt'а.

## 4. Что считать сигналами хорошего prompt'а

Стартовый prompt работает хорошо, если агент:

- начинает с анализа входных artifacts;
- сам строит рабочий алгоритм шага;
- использует research только там, где это нужно;
- сравнивает варианты, если step требует выбора;
- создаёт draft без ранних лишних вопросов;
- явно отделяет active, advisory, deferred и planned work;
- не материализует файлы вне полномочий шага;
- не создаёт downstream sessions;
- держит `accepted=false` до явного пользовательского подтверждения;
- в финале задаёт только реальные open decisions.

Ключевой критерий: пользователь должен обсуждать решения, а не объяснять агенту базовый алгоритм его шага.

## 5. Что считать дефектами step front

Дефект prompt'а фиксируется, если агент:

- сразу пишет generic artifact без research/design pass;
- задаёт вопросы до попытки самому собрать baseline;
- не читает accepted upstream artifacts;
- путает текущий stage и следующий stage;
- предлагает materialization, хотя step contract-only;
- включает deferred gates в active blockers;
- смешивает выбранный baseline с strict-only checks;
- не различает human-readable reasoning и machine-readable contract;
- не понимает, чем заканчивается его работа;
- просит пользователя подтвердить то, что уже должно быть выведено из skeleton или prior artifacts.

Такие ошибки нужно исправлять в стартовом prompt'е, contract reference, schema или runtime-provided context. Не нужно считать их проблемой конкретной сессии, если они вызваны слабым входным контрактом.

## 6. Как переносить findings в prompt

Каждый finding нужно превращать в правило на правильном уровне.

Если агент не знает, с чего начать, добавляется **Required Pass**:

- inspect inputs;
- infer project/state;
- compare options;
- write draft;
- ask only final open decisions.

Если агент делает лишнюю работу, добавляется **Completion Boundary**:

- что является Definition of Done;
- что запрещено после Done;
- какой следующий step должен запускаться отдельно.

Если агент путает статусы, добавляется **Machine Contract Consistency**:

- stable ids;
- statuses;
- selected baseline;
- active required arrays;
- deferred/planned/advisory sections;
- validation checklist before final response.

Если агент задаёт лишние вопросы, добавляется **Question Deferral Rule**:

- сначала создать best-effort draft;
- вопросы задавать только после draft;
- вопрос должен быть невозможен к выводу из accepted artifacts или research.

## 7. Machine-readable artifacts требуют отдельной проверки

Markdown может быть понятным человеку и одновременно плохо управлять будущими агентами.

Для JSON/YAML/DSL artifacts нужно отдельно проверять:

- есть ли stable ids;
- не зашита ли логика только в свободный текст;
- совпадают ли selected variant и required arrays;
- не попали ли deferred/advisory элементы в active blockers;
- есть ли materialization status;
- есть ли user-confirmable decisions;
- достаточно ли contract metadata для downstream agents.

Если artifact должен стать входом следующего stage, machine-readable consistency является частью prompt'а, а не пост-фактум review.

## 8. Universal workflow для любого шага

Для каждого workflow step используется один и тот же цикл:

1. Запустить step на реалистичном workspace state.
2. Наблюдать reasoning, первые действия и финальный draft.
3. Не исправлять draft ради acceptance, если цель теста — prompt quality.
4. Выделить prompt-level defects.
5. Перенести defects в стартовый prompt, contract reference или schema.
6. Собрать release, если изменение должно попасть пользователю.
7. Перезапустить step с нуля и проверить, исчез ли дефект поведения.

Этот цикл повторяется, пока агент не начинает делать правильный workflow без coaching.

## 9. Пример: Quality Gates Baseline

В тесте `Quality Gates Baseline` важным результатом был не сам `quality-gates.md`.

Реальные prompt-level findings:

- агент сначала создавал слишком общий baseline без research/design pass;
- prompt не требовал сравнения tooling strategies;
- architecture gate был недостаточно first-class;
- completion boundary не был достаточно явным;
- machine-readable contract мог смешивать `selectedBaseline`, strict-only checks, active required arrays и deferred gates.

Исправление было внесено не в тестовый artifact, а в step front:

- добавлен research-first pass;
- добавлены `minimal` / `recommended` / `strict` variants;
- добавлена first-class architecture gate requirement;
- добавлена completion boundary;
- добавлены `id`, `proposedCommand`, `status`, `baseline`, `blockingIn` и consistency check для machine-readable contract.

После этого агент начал сам исследовать, создавать draft без промежуточных вопросов и выносить только финальные open decisions.

## 10. Definition of Done для prompt testing

Prompt testing считается успешным, если:

- найденные defects перенесены в step front;
- новый запуск демонстрирует изменённое поведение агента;
- агент проходит stage без ручного coaching;
- финальные вопросы относятся к реальным user decisions;
- scope шага не расширяется самопроизвольно;
- artifacts остаются draft до explicit acceptance;
- следующий step получает понятный и согласованный contract.

Если эти условия выполнены, тест можно завершать даже без принятия конкретного artifact из тестового workspace.
