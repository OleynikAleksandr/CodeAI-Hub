# Workflow Prompt Language Contract — Planning Doc

**Status:** Active planning doc  
**Created:** 2026-05-05  
**Scope:** унифицировать языковой контракт стартовых workflow prompt packs, материализовать localized instruction blocks для workflow и Development Tree first prompts, вложить authoritative source documents в первые prompts ранних шагов `Description`, `Virtual Simulation`, `Diagram Modules`, и закрепить bounded/no-read first-draft behavior для Development Tree node sessions.

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
3. Передавать нужные source documents прямо в первом prompt:
   - `Description` получает полный `questionnaire.md`;
   - `Virtual Simulation` получает полный `Final_Description.md`;
   - `Diagram Modules` получает полный `Final_Description.md` и полный `virtual-simulation.md`;
   - path/reference остаётся fallback, но agent не должен тратить отдельные tool cycles на чтение документов целиком.
4. Сохранить и усилить принятый Development Tree behavior:
   - Development Tree node agents получают deterministic scoped context extractor, а не полный dump всех upstream docs;
   - exact owner Product Part Markdown передаётся целиком как protected context;
   - automatic first-draft pass запрещает читать/search/list/open любые не перечисленные файлы до явного разрешения пользователя;
   - node-agent chat/artifact language directives остаются разделёнными и могут материализоваться как localized instruction blocks.

---

## 3. Non-Goals

- Не менять provider/model selection.
- Не переводить protected canonical tokens, provider flags, filenames, ids, statuses, YAML/frontmatter keys, HTML comments, `agent-fill`, DSL markers, method/event names или structural headings.
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

Ранние steps не должны начинать первый draft с отдельного tool cycle на чтение source документов, которые Core уже знает и может безопасно вложить. Для `Description`, `Virtual Simulation` и `Diagram Modules` это дешевле и надёжнее сделать в first prompt.

Новый контракт:

- `Description` first prompt includes `questionnaire.md` full content with:
  - relative path;
  - absolute path;
  - fenced source block;
  - fallback instruction if inline content is missing/stale.
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

Core must pre-create the materialized Development Tree folders and target draft files before the provider prompt is sent. The first prompt names exact target paths and describes the agent's job as filling those artifacts, not discovering, creating, or validating the directory structure.

### 4.2.3. Development Tree Contract Artifact Language Boundary

Development Tree contract artifacts are not an English-language exception. If `Settings > General > Artifacts for the User` is `ru`, explanatory prose inside `<!-- agent-fill -->` blocks in `ModuleFacadeContract.draft.md` and `ClusterFacadeContract.draft.md` must also be Russian.

The stable contract surface remains canonical:

- method and event names;
- ids;
- filenames;
- structural headings;
- YAML/frontmatter keys;
- status tokens;
- DSL and field tokens.

Only explanatory text is localized: descriptions, boundary rationale, assumptions, open questions, and brief user-facing artifact notes. This prevents agents from misreading `contract` as `English prose`.

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

### 4.5. Localized Prompt Pack Materialization

Localized prompt instruction packs may be materialized or cached during install/bootstrap, but the cache key must include all dimensions that can change the generated instruction text:

- user-facing chat language / response language;
- artifact prose language;
- promptPackVersion;
- appVersion.

`promptPackVersion` invalidates cache entries when the instruction contract changes without an app version bump. `appVersion` invalidates entries across release upgrades. A localized prompt pack must never translate protected canonical tokens: filenames, ids, statuses, YAML/frontmatter keys, HTML comments, `agent-fill`, DSL markers, field names, method/event names, output filenames, and structural headings stay stable.

### 4.6. Patch-Friendly Draft Template And Readiness Guard

Workflow and Development Tree draft templates must be patch-friendly for provider-native patch/edit workflows:

- `agent-fill` blocks have deterministic surrounding whitespace, LF endings, no trailing spaces, and a sentinel inside empty fill regions;
- prompts instruct agents to replace sentinel/content inside `agent-fill` instead of diagnosing routine patch mismatch to the user;
- routine tool discovery and fallback chatter (`python` vs `python3`, encoding retry, line-by-line probing) is not user-facing unless artifact write remains blocked.

Readiness must remain content-based. A draft with an unbalanced `agent-fill` marker is not ready, even if other required text exists. The classifier keeps the node `in_progress` until markers are balanced and required `agent-fill` regions are completed.

---

## 5. Implementation Surfaces

- `src/client/project-manager/services/prompt-pack-builder.ts`
- `src/client/project-manager/services/prompt-localized-instructions.ts`
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
- `packages/core/src/development-tree/node-bootstrap/node-first-message-builder.ts`
- `packages/core/src/development-tree/node-bootstrap/localized-node-prompt-instructions.ts`
- `packages/core/src/development-tree/node-bootstrap/draft-template-registry.ts`
- `packages/core/src/development-tree/node-bootstrap/draft-readiness-classifier.ts`
- `packages/core/src/development-tree/node-bootstrap/node-first-message-builder.test.ts`
- `packages/core/src/development-tree/node-bootstrap/draft-readiness-classifier.test.ts`

---

## 6. Acceptance Criteria

1. With Settings language `ru`, `Description`, `Virtual Simulation`, `Diagram Modules`, and Development Tree node first prompts contain:
   - chat language directive from `Settings > General > Reasoning`;
   - artifact prose language directive from `Settings > General > Artifacts for the User`;
   - localized instruction prose where supported;
   - final reminder that English examples/templates are format-only.
2. `Description` first prompt contains full inline `questionnaire.md`.
3. `Virtual Simulation` first prompt contains full inline `Final_Description.md`.
4. `Diagram Modules` first prompt contains full inline `Final_Description.md` and `virtual-simulation.md`.
5. Prompt/template tests prove structural tokens remain unlocalized.
6. Manual retest on a weak/low-thinking model verifies:
   - chat replies stay in selected chat language;
   - artifacts prose stays in selected artifact language;
   - contract syntax remains parseable.
7. Development Tree node first prompts include the draft-pass source boundary:
   - use first-prompt scoped context plus listed target draft files only;
   - do not read/search/list/open other workspace files during the automatic draft-pass;
   - allow additional file reads only after explicit user request or permission.
8. Development Tree contract artifact first prompts explicitly state that `ModuleFacadeContract.draft.md` and `ClusterFacadeContract.draft.md` localize explanatory prose inside `agent-fill`; only canonical method/event names, ids, headings, filenames, fields, status tokens, and DSL markers stay English.
9. Localized prompt pack materialization is cache-safe:
   - cache keys include chat/response language, artifact prose language, `promptPackVersion`, and `appVersion`;
   - tests compare localized and non-localized prompt output as separate language-keyed variants;
   - tests assert protected canonical tokens remain present and untranslated in localized prompt packs.
10. Patch-friendly draft/readiness tests prove deterministic `agent-fill` shape, sentinel replacement, LF/no trailing whitespace, and `in_progress` readiness for unbalanced markers.

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

2026-05-05 targeted verification passed for the workflow prompt language contract baseline:

- `node --import tsx --test src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts src/client/project-manager/services/description-submit-service.localization.test.ts src/client/project-manager/services/workflow-step-start-service.gating.test.ts` — 10/10 tests passed.
- `node --import tsx --test packages/core/src/templates/template-sync-service.test.ts packages/core/src/remote-bridge/handlers/idea-contract-service.virtual-simulation.test.ts packages/core/src/remote-bridge/handlers/idea-contract-service.diagram-stages.test.ts` — 7/7 tests passed.
- `npm run typecheck:webview` — passed.
- `npm run build --workspace=@codeai-hub/core` — passed.

2026-05-05 follow-up verification passed for the localized prompt / Development Tree hardening release line:

- 28 workflow prompt and Development Tree node prompt/readiness tests passed, covering localized workflow instructions, localized Development Tree first prompts, protected canonical tokens, contract artifact prose localization, exact owner Markdown context, no-read draft-pass wording, and unbalanced `agent-fill` readiness guard.
- `npm run build --workspace=@codeai-hub/core` — passed.
- `npm run typecheck:webview` — passed.
- `npm run build:webview` — passed.
- `./scripts/build-all.sh` — passed and produced release artifacts for `1.2.149`.
- `./scripts/build-release.sh --use-current-version` — passed; SDK exclusions, local artefacts, markdown links/duplication advisory checks, production dependency pruning, VSIX runtime package surface, and package creation were verified.
- Release artifact: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.2.149.vsix`.
