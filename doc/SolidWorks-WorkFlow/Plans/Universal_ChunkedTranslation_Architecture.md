# Universal Chunked Translation — Planning Doc

**Status:** Approved planning source
**Created:** 2026-04-13 21:22 CEST
**Owner:** Oleksandr + Codex

---

## 1. Problem statement

В релизе `1.1.978` live thinking translation для Codex был диагностирован и приведён в рабочее состояние: reasoning-bubble теперь переводится быстро, полностью и фрагментарно.

Но отдельный локализационный контур всё ещё деградирует при выборе translation engine `OpenAI Codex · GPT-5.3 Codex Spark`:

- `Description Help`
- `Virtual Simulation Help`
- helper / hint copy в confirmation card
- explanatory copy в Settings

дают mixed-language surface: часть текста остаётся английской, часть переводится на русский.

При этом тот же набор surface-ов при переключении на `Google GTX Free` становится полностью русскоязычным.

Значит проблема лежит не в UI rendering path, а в materialization / transport path для локализационных bundle-ов и, шире, в стратегии отправки текста в translation engine.

---

## 2. Confirmed evidence

### 2.1. UI is not the defect boundary

Подтверждено локально:

- после переключения engine на `google-gtx` файлы
  - `~/.codeai-hub/localization/catalogs/user_guidance/ru.json`
  - `~/.codeai-hub/localization/catalogs/system_feedback/ru.json`
  пересобираются и содержат русские значения для тех же ключей, которые ранее были mixed-language при `codex-gpt-5.3-codex-spark`;
- значит UI показывает именно то, что уже сохранено в localization bundle, а не ломает текст при рендере.

### 2.2. The current fallback behavior is intentional

Текущее поведение materializer:

- если engine не успел или вернул empty translation, translation layer возвращает `fallback`;
- `fallback.finalText` = исходный English text;
- это значение сохраняется в `ru` bundle.

Это поведение **нельзя убирать** в данном scope: English fallback лучше, чем пустота или дыра в UI copy.

### 2.3. The root cause is monolithic-string translation under fixed timeout

Подтверждено прямыми локальными прогонками одних и тех же строк:

- default timeout translation layer = `3000ms`;
- `LocalizationMaterializer` не передаёт отдельный timeout и использует этот default;
- длинные строки на `codex-gpt-5.3-codex-spark` стабильно падают в `fallback` примерно на границе `~3016-3108ms`;
- короткие строки на том же engine проходят за `~2169-2301ms`;
- те же длинные строки при увеличенном timeout переводятся корректно;
- `google-gtx` те же строки успевает перевести и при текущем бюджете.

Конкретно воспроизведены такие problematic keys:

- `pm.description.help.cluster_module_explanation`
- `pm.virtual_simulation.help.intro`

и control examples, которые при тех же условиях проходят:

- `settings.core_controls.description`
- `pm.confirmation_card.selected_provider_override_hint`
- `pm.description.help.submit_guidance`

---

## 3. Goal of this scope

Сделать translation pipeline устойчивым к длинным user-facing fragments **во всех runtime path-ах**, а не только в bundle materialization.

Целевое поведение:

1. длинный текст не отправляется в engine одним монолитным куском;
2. текст режется на безопасные чанки;
3. каждый чанк переводится независимо;
4. если какой-то чанк не успел, только он деградирует до English fallback;
5. итоговый surface остаётся без дырок;
6. тот же механизм работает и для live interactive translation, и для persistent localization bundles.

---

## 4. Non-goals

В этом scope не планируется:

- убирать fallback-to-English поведение;
- чинить это через UI-specific hotfixes;
- менять локализационные категории (`UI Labels`, `UI Helper Text`, `Messages for the User`, `Artifacts for the User`);
- переводить internal prompts / provider instructions;
- делать sentence-by-sentence UI streaming обязательной частью первой итерации.

Если progressive per-chunk UI updates дадут value позже, это может стать отдельным follow-up, но не является обязательным первым DoD.

---

## 5. Proposed solution

### 5.1. Universal chunking in shared translation layer

Chunking должен жить не в отдельных consumer-ах, а в shared translation boundary (`packages/translation/`), чтобы одинаково применяться к:

- localization bundle materialization;
- Core-owned live thinking / runtime translation;
- будущим translation consumers.

### 5.2. Safe chunk boundaries

Chunker не должен резать текст по сырому числу символов.

Приоритет boundary resolution:

1. пустая строка / paragraph break;
2. list item boundary;
3. sentence boundary;
4. clause-level punctuation как fallback;
5. hard split только как last resort и только вне protected regions.

Нельзя резать внутри:

- fenced / inline code fragments;
- file paths / filenames;
- Markdown links;
- placeholder variables вроде `{upstreamStage}`;
- glossary markers вроде `[[CAIHUB_TERM_n]]`.

### 5.3. Engine-specific chunk budgets

Chunk budgets должны подбираться эмпирически по engine/model, а не глобально одной константой.

Минимальный initial policy:

- профилировать безопасный объём текста для
  - `google-gtx`
  - `codex-gpt-5.4-mini`
  - `codex-gpt-5.3-codex-spark`
- operational chunk limit брать консервативно, с запасом, а не на грани таймаута;
- хранить policy как engine-profile table, а не разбрасывать magic numbers по consumer-ам.

### 5.4. Per-chunk fallback, not per-string failure

Если отдельный chunk не перевёлся:

- этот chunk остаётся source English;
- соседние chunks всё равно переводятся;
- итоговая assembled string не содержит дырок.

Это сохраняет текущий safety contract и одновременно убирает системную потерю целого длинного блока из-за одного timeout budget.

---

## 6. Architectural shape

### 6.1. New shared translation internals

Ожидаемые новые internal units:

- `translation-chunk-planner.ts`
- `translation-chunk-boundary-resolver.ts`
- `translation-engine-profile-registry.ts`
- `translation-chunk-assembler.ts`

### 6.2. Existing files expected to change

Вероятный write scope первой implementation wave:

- `packages/translation/src/translation-facade.ts`
- `packages/translation/src/translation-request-normalizer.ts`
- `packages/translation/src/codex-cli-translation-engine.ts`
- `packages/localization/src/localization-materializer.ts`
- `packages/core/src/session-translation/session-translation-facade.ts`

Допускается уточнение списка после execution planning, но принцип должен остаться таким:

- shared chunking logic centralizes in `packages/translation/`;
- callers only opt into the shared policy and diagnostics.

---

## 7. Diagnostics and observability

Нужно добавить диагностику для chunk path, чтобы следующий подобный регресс не превращался в гадание.

Минимальные correlation fields:

- `engineId`
- `category`
- `messageId` или `bundle message key`, где применимо
- `chunkIndex`
- `chunkCount`
- `chunkSourceLength`
- `elapsedMs`
- `status`
- `errorCode`

Нужны отдельные события для:

- planning chunk boundaries;
- dispatch per chunk;
- chunk success / fallback;
- final assembly summary.

---

## 8. Verification strategy

### 8.1. Direct engine verification

Нужно воспроизвести одни и те же строки через:

- `google-gtx`
- `codex-gpt-5.4-mini`
- `codex-gpt-5.3-codex-spark`

и зафиксировать:

- безопасный объём chunk-а;
- среднее время ответа;
- деградацию на длинных fragments.

### 8.2. Bundle verification

После фикса при engine `codex-gpt-5.3-codex-spark`:

- `~/.codeai-hub/localization/catalogs/user_guidance/ru.json`
- `~/.codeai-hub/localization/catalogs/system_feedback/ru.json`

не должны показывать систематический mixed-language pattern на длинных help/helper keys.

### 8.3. Live path verification

Для long live translation fragments:

- не должен происходить whole-fragment fallback только из-за общего timeout на весь block;
- если chunk не успел, English fallback допускается только на уровне отдельного chunk-а;
- source-first interactivity должна сохраниться.

---

## 9. Risks and constraints

1. Слишком агрессивный chunking может ломать смысл, если резать без уважения к Markdown/placeholder boundaries.
2. Слишком мелкие chunk-и приведут к лишним запросам, latency overhead и token overhead.
3. Слишком крупные chunk-и вернут текущую проблему timeout-driven whole-fragment fallback.
4. Chunk policy должна быть engine-aware; один общий size budget для всех engines почти наверняка даст новые регрессии.

---

## 10. Execution guidance for the next session

Следующая сессия не должна сразу писать код без execution planning.

Сначала нужно:

1. взять этот planning-doc как approved planning source;
2. нарезать `doc/TODO/todo-plan.md` на micro-tasks;
3. начать с instrumentation + chunk planner + empirical engine profiling;
4. only after that переходить к actual implementation.

---

## 11. Summary decision

Текущий вывод этого planning scope:

- fallback-to-English остаётся каноническим safety behavior;
- root cause — не fallback, а monolithic-string translation under fixed timeout;
- правильный следующий scope — **universal chunked translation** для всех translation paths, с safe boundaries и engine-specific conservative chunk budgets.
