# Workflow Prompt Language Contract — Planning Doc

**Status:** Active planning doc  
**Created:** 2026-05-05  
**Scope:** унифицировать языковой контракт стартовых workflow prompt packs и вложение upstream source documents для ранних шагов `Description`, `Virtual Simulation`, `Diagram Modules`; сохранить принятый Development Tree scoped node prompt behavior без регрессии.

---

## 1. Why This Exists

Во время retest release `1.2.142` Development Tree materialization был принят: структура в workspace, Project Manager sidebar readiness, выбранные node sessions/artifacts, scoped node prompt context, русский диалог и русские draft artifacts для Development Tree node agents работают.

Отдельно был обнаружен смежный риск ранних workflow prompts: `Diagram Modules` на Claude Haiku без размышлений получил `Artifacts for the User language (runtime directive): Target language code: ru`, но всё равно ответил и создал artifacts на английском. Это не blocking bug закрытого Development Tree scope, а workflow-wide prompt contract debt.

Ключевое наблюдение: в `Description` аналогичный language block сработал даже на Haiku. Значит проблема не в Settings как источнике истины, а в неодинаковой силе/позиционировании prompt directives, английских examples/templates и отсутствии единого разделения chat language vs artifact prose language во всех workflow prompt packs.

---

## 2. Goals

1. Ввести единый runtime language contract для всех workflow-start prompt packs:
   - **chat language** берётся из `Settings > General > Reasoning`;
   - **artifact prose language** берётся из `Settings > General > Artifacts for the User`;
   - английские instructions/templates/examples являются format-only и не задают язык ответа;
   - canonical headers, field names, ids, statuses, DSL markers, filenames и structural tokens остаются contract-valid.
2. Сделать directive заметным для слабых моделей / low-thinking режимов:
   - основной блок ближе к началу prompt;
   - короткий final reminder ближе к концу prompt;
   - явное правило не копировать язык examples.
3. Для шагов после `Description` передавать нужные upstream documents прямо в первом prompt:
   - `Virtual Simulation` получает полный `Final_Description.md`;
   - `Diagram Modules` получает полный `Final_Description.md` и полный `virtual-simulation.md`;
   - path/reference остаётся fallback, но agent не должен тратить отдельные tool cycles на чтение документов целиком.
4. Сохранить принятый Development Tree behavior:
   - Development Tree node agents продолжают получать deterministic scoped context extractor, а не полный dump всех upstream docs;
   - node-agent chat/artifact language directives остаются разделёнными и не регрессируют.

---

## 3. Non-Goals

- Не менять provider/model selection.
- Не переводить внутренние инструкции целиком на язык пользователя.
- Не локализовывать canonical DSL/contract markers, filenames, ids, status/frontmatter tokens или field names.
- Не возвращать полный upstream artifact dump в Development Tree node prompts.
- Не менять Project Manager UI behavior, кроме indirect effects от prompt generation.

---

## 4. Proposed Design

### 4.1. Unified Runtime Language Block

`buildWorkflowPromptPack` должен получать два независимых language values:

- `chatLanguageCode`: язык коротких user-facing chat updates;
- `artifactLanguageCode`: язык user-facing artifact prose.

Prompt block должен явно говорить:

- общаться с пользователем на `chatLanguageCode`;
- писать prose в создаваемых/редактируемых artifacts на `artifactLanguageCode`;
- не менять internal instructions, code identifiers, canonical headings/fields/ids/statuses/DSL markers/filenames;
- English examples are format examples only.

Для устойчивости к low-thinking моделям block должен появляться в начале prompt pack, а в конце prompt pack должен быть короткий reminder.

### 4.2. Source Documents Inline Payloads

Сегодня ранние steps часто получают только paths и затем agent читает документы отдельными инструментами. Для `Virtual Simulation` и `Diagram Modules` это не экономит контекст: агенту всё равно нужно читать документы полностью.

Новый контракт:

- `Virtual Simulation` first prompt includes `Final_Description.md` full content with:
  - relative path;
  - absolute path;
  - fenced source block;
  - fallback instruction if inline content is missing/stale.
- `Diagram Modules` first prompt includes both full upstream source docs:
  - `Final_Description.md`;
  - `virtual-simulation.md`.

This is intentionally different from Development Tree node prompts, where accepted behavior is deterministic scoped context by Product Part / Cluster / Module anchors.

### 4.2.1. Development Tree Exact Owner Markdown Context

Development Tree node prompts stay scoped and must not receive a full dump of every upstream workflow artifact. There is one explicit exception: an exact owner Markdown source whose path and id directly match the node is authoritative input, not fuzzy context.

For Product Part nodes, `.codeai-hub/<workspaceSlug>/diagram_modules/product-parts/<part-id>.md` is the exact owner artifact. When it exists, Core must include its full Markdown content in the first Product Part node prompt as protected context. It must not be split into scored snippets or allowed to fall out of the prompt because `Final_Description.md`, `virtual-simulation.md`, or `product-parts.index.md` happen to match broad anchors such as `Project Manager`.

For Cluster and Module nodes, Core continues to use scoped excerpts from upstream artifacts, including the owning Product Part artifact, selected by node/cluster/module anchors. Parser/scoring is therefore reserved for indirect upstream context; direct owner Markdown is passed whole.

### 4.2.2. Development Tree Draft-Pass Read Boundary

Development Tree Product Part / Cluster / Module sessions are an automatic first-draft pass, not the final specification review. For this pass, Core must provide enough scoped context in the first prompt for agents to create fast initial drafts without exploration.

Node agents may inspect and edit only the listed target draft files during this automatic first turn. They must not read, search, list, or open other workspace files or upstream documents during the draft-pass, even if an excerpt says it is truncated. Missing detail must be recorded as an explicit Open question inside the draft instead of triggering another file-read cycle.

Additional file reading becomes allowed only after the user explicitly asks for it or grants permission in a later dialog turn. This keeps the automated materialization fast and bounded while preserving user-directed depth for the review/refinement stage.

### 4.3. Template Hardening

Prompt assets for `Description`, `Virtual Simulation`, and `Diagram Modules` must stop relying on weak language wording like "final artifact and brief updates". They should defer to the runtime language block and clarify:

- user-facing prose follows runtime language settings;
- examples/templates are structural examples;
- agent must not infer English output language from English internal instructions.

Diagram Modules artifact templates need an explicit boundary:

- prose fields are localized;
- canonical field labels, ids, status values, generated block markers, table/DSL syntax and filenames stay stable.

### 4.4. Runtime Tooling And UTF-8 Write Discipline

Workflow and Development Tree prompts must include a compact runtime facts block so agents do not waste a turn discovering routine tools:

- shell tools start in the runtime workspace context when they are available;
- Python command is `python3`;
- Node command is `node`;
- package manager command is `npm`;
- routine fallback chatter such as "python is missing, switching to python3" is prohibited unless the command failure blocks the artifact update.

Prompts must also state the artifact write encoding contract:

- Markdown artifacts and drafts are UTF-8 text with normal LF line endings;
- Cyrillic/localized prose is written directly as UTF-8, not escaped or transliterated;
- provider-native edit/write is preferred when it preserves UTF-8;
- if a write path corrupts localized text, the agent may retry with a UTF-8-safe shell heredoc or equivalent exact-write method;
- routine encoding retry messages are not user-facing progress updates and should be reported only if encoding remains a blocker.

---

## 5. Implementation Surfaces

- `src/client/project-manager/services/prompt-pack-builder.ts`
- `src/client/project-manager/services/description-submit-service.ts`
- `src/client/project-manager/services/workflow-step-start-service.ts`
- `src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts`
- `src/client/project-manager/services/description-submit-service.localization.test.ts`
- `src/client/project-manager/services/workflow-step-start-service.gating.test.ts`
- `packages/agents/description-agent/assets/description-collector-prompt.md`
- `packages/core/src/templates/source/virtual-simulation-prompt.md`
- `packages/agents/diagram-modules-agent/assets/diagram-modules-prompt.md`
- `packages/agents/diagram-modules-agent/assets/product-parts-index-template.md`
- `packages/agents/diagram-modules-agent/assets/product-part-template.md`
- `packages/core/src/remote-bridge/handlers/idea-contract-service.diagram-stages.test.ts`
- `packages/core/src/templates/template-sync-service.test.ts`

---

## 6. Acceptance Criteria

1. With Settings language `ru`, `Description`, `Virtual Simulation`, and `Diagram Modules` first prompts contain:
   - chat language directive from `Settings > General > Reasoning`;
   - artifact prose language directive from `Settings > General > Artifacts for the User`;
   - final reminder that English examples/templates are format-only.
2. `Virtual Simulation` first prompt contains full inline `Final_Description.md`.
3. `Diagram Modules` first prompt contains full inline `Final_Description.md` and `virtual-simulation.md`.
4. Prompt/template tests prove structural tokens remain unlocalized.
5. Manual retest on a weak/low-thinking model verifies:
   - chat replies stay in selected chat language;
   - artifacts prose stays in selected artifact language;
   - contract syntax remains parseable.
6. Development Tree node first prompts include the draft-pass source boundary:
   - use first-prompt scoped context plus listed target draft files only;
   - do not read/search/list/open other workspace files during the automatic draft-pass;
   - allow additional file reads only after explicit user request or permission.

---

## 7. Context Pack For todo-plan

- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Docs_Index.md`
- `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`
- `doc/SolidWorks-WorkFlow/Plans/Workflow_Prompt_Language_Contract_Architecture.md`
- `src/client/project-manager/services/prompt-pack-builder.ts`
- `src/client/project-manager/services/description-submit-service.ts`
- `src/client/project-manager/services/workflow-step-start-service.ts`
- `packages/agents/description-agent/assets/description-collector-prompt.md`
- `packages/core/src/templates/source/virtual-simulation-prompt.md`
- `packages/agents/diagram-modules-agent/assets/diagram-modules-prompt.md`

---

## 8. Verification Evidence

2026-05-05 targeted verification passed for the workflow prompt language contract:

- `node --import tsx --test src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts src/client/project-manager/services/description-submit-service.localization.test.ts src/client/project-manager/services/workflow-step-start-service.gating.test.ts` — 10/10 tests passed.
- `node --import tsx --test packages/core/src/templates/template-sync-service.test.ts packages/core/src/remote-bridge/handlers/idea-contract-service.virtual-simulation.test.ts packages/core/src/remote-bridge/handlers/idea-contract-service.diagram-stages.test.ts` — 7/7 tests passed.
- `npm run typecheck:webview` — passed.
- `npm run build --workspace=@codeai-hub/core` — passed.
