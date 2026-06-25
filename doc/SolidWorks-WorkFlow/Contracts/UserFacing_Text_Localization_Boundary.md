# User-Facing Text Localization Boundary (SSOT)

**Status:** Active
**Updated:** 2026-06-25
**Owner:** Oleksandr + Codex

---

## 1. Purpose

This contract exists to stop a recurring class of regressions:

- new UI/features ship with hardcoded English product copy;
- product-owned text is added without an explicit localization category;
- internal prompts and user-facing copy get mixed into the same translation path.

Every change that adds product-authored text must classify that text before implementation is considered complete.

---

## 2. Mandatory Authoring Rule

If CodeAI Hub authors, renders, stores, or updates a text that the product owns, that text must have an explicit localization ownership decision.

Allowed outcomes are only:

1. `UI Labels`
2. `UI Helper Text`
3. `Messages for the User`
4. `Artifacts for the User`
5. `Reasoning` (runtime-only category for visible provider `Thinking` / `Reasoning` bubbles shown in the Session dialog)
6. `Internal Agent Instructions` (code-owned prompt/instruction boundary; localized instruction blocks are allowed only through explicit prompt contracts)

Automatic guessing is not allowed.

Inline hardcoded product copy inside React components, view helpers, workflow presenters, or template builders is not an acceptable steady state.

---

## 3. Classification Rules

### 3.1. `UI Labels`

Use for short interface terms such as:

- button labels;
- tab names;
- section titles;
- form labels;
- menu items;
- short shell placeholders.

### 3.2. `UI Helper Text`

Use for explanatory interface copy such as:

- helper paragraphs under a setting or control;
- onboarding hints;
- short descriptions that clarify what an option does;
- inline setting guidance that is not an error/warning/status.

### 3.3. `Messages for the User`

Use for user-addressed runtime communication such as:

- warnings;
- errors;
- validation messages;
- empty states;
- status lines;
- success/failure notices;
- larger help panels and runtime guidance blocks.

After the UI/Reasoning translation split, `Messages for the User` no longer owns visible provider `Thinking` / `Reasoning` bubbles. That ownership now lives under the dedicated `Reasoning` category (§3.5) with its own target language and its own `Reasoning Translation Engine` selector, independent from `Messages for the User` language and from the `UI Translation Engine`. Hidden thinking that is filtered out of the user-visible transcript stays outside the localization pipeline and is not translated.

### 3.4. `Artifacts for the User`

Use for product-authored content that the user edits, reviews, or exports, such as:

- questionnaires;
- structured forms authored by the product;
- staged workflow artifact shell text;
- final user-facing generated artifact scaffolding owned by the product;
- brief user-facing workflow chat updates when the runtime explicitly threads artifact language into agent-facing instructions.

When an artifact mixes stable structural identifiers with descriptive prose, the ownership decision may be split inside the same artifact:

- canonical structural names, ids, and titles that function as stable architecture vocabulary may remain English-only;
- descriptive prose such as purposes, responsibilities, notes, and assumptions may follow the configured `Artifacts for the User` language.

### 3.5. `Reasoning`

Use for visible provider `Thinking` / `Reasoning` bubbles surfaced in the Session dialog transcript:

- streaming `thinking_delta` / reasoning segments emitted by the provider while a turn is in flight;
- final assembled thinking blocks and tool-use preamble text that is rendered under the thinking contract;
- visible thought/progress copy produced by provider-local adapters that still run their own reasoning translation path.

`Reasoning` ownership constraints:

- target language is selected through the dedicated fifth `Reasoning` card in the localization settings section; it is independent from `Messages for the User` after the UI/Reasoning translation split;
- translation engine is selected through the dedicated `Reasoning Translation Engine` selector (default `Google GTX Free` for low-risk live translation); it is independent from the `UI Translation Engine`;
- `Reasoning` is a runtime-only category — there is no bundled English source dictionary for live thought bubbles, and reasoning does not participate in browser bootstrap bundle materialization;
- visible pending labels for translation-first reasoning, for example `Перевод...`, are product-authored status copy rather than provider thought text. They must be localized through the ordinary UI/message dictionary boundary and must not be treated as model output or as a `Reasoning` overlay record;
- while a visible reasoning bubble is pending translation, the UI must not render the source English `content` as an interim buffer. It should show the local pending label, then reveal translated `localizedContent` progressively when the runtime overlay arrives;
- reasoning engine or reasoning language changes are never strict save-impact: they never block Settings save, never block Project Manager / new session sends, and never trigger a UI bundle rebuild;
- hidden provider `Thinking` / `Reasoning` that is filtered out of the user-visible transcript stays outside the localization pipeline entirely and is never translated.

### 3.6. `Internal Agent Instructions`

Use for:

- agent prompts;
- system instructions;
- hidden technical templates;
- internal routing/authoring text that is not shown to the user;
- workflow/provider prompt bodies even when those prompts additionally instruct the agent which language to use for user-facing artifacts or brief user-facing chat updates.

This boundary is code-owned. Bundled source prompt contracts and protected canonical tokens remain stable, but a separate explicit contract may materialize localized instruction prose inside first prompts. The current explicit exception is the workflow prompt language contract:

- workflow first prompts may include localized instruction blocks keyed by `Settings > General > Reasoning`;
- artifact prose directives are keyed by `Settings > General > Artifacts for the User`;
- protected tokens are never localized: filenames, ids, statuses, YAML/frontmatter keys, HTML comments, `agent-fill`, DSL markers, field names, method/event names, output filenames, and structural headings.

Localized prompt materialization does not move provider flags, system tools, sandbox, approval policy, or canonical schema tokens into user-facing localization dictionaries.

---

## 4. Implementation Rules

When adding or changing user-facing product copy:

1. Add or reuse a stable message id in the appropriate English source dictionary.
2. Resolve the text through the shared localization runtime instead of making the component/template the source of truth.
3. Keep fallback strings only as bootstrap safety, not as the primary authoring location.
4. Do not place user-facing copy inside provider/internal prompt assets unless that surface is intentionally an internal prompt boundary or an explicit localized prompt materializer owns the text.
5. If one surface contains multiple text kinds, split them by category instead of forcing one category onto the whole file.
6. If a workflow prompt contains both internal instructions and an explicit language directive for user-facing artifacts/chat updates, only the resulting user-facing output belongs to `Artifacts for the User` / `Reasoning`; the prompt body itself remains `Internal Agent Instructions` unless an explicit localized prompt materializer owns that instruction prose.
7. For mixed DSL artifacts such as `Diagram Modules`, treat canonical `Product Part` / `Cluster` / `Module` names and titles as structural vocabulary, not as automatically localizable prose.

---

## 4.5. Source Dictionary File Map

The localization pipeline loads **approved** source dictionary files first. Legacy files exist as fallback but are **shadowed** when the approved file is present. Never add new keys to legacy files.

- Runtime category `ui_interface` / `workflow_terms` → **`ui_labels.json`** (approved); `ui_interface.json`, `workflow_terms.json` are legacy
- Runtime category `user_guidance` → **`ui_helper_text.json`** (approved); `user_guidance.json` is legacy
- Runtime category `system_feedback` → **`messages_for_the_user.json`** (approved); `system_feedback.json` is legacy
- Runtime category `interactive_templates` → **`artifacts_for_the_user.json`** (approved); `interactive_templates.json` is legacy

All files live under `assets/localization/source/en/`. The registry logic is in `packages/localization/src/source-dictionary-registry.ts` (`resolveBundledSourceFileCandidates`).

When a component calls `t(category, messageId, fallback)`, the `category` is the runtime id (e.g. `user_guidance`), but the source key must exist in the **approved** file for that category (`ui_helper_text.json`), not the legacy one.

For template variables use `{variableName}` syntax in dictionary values and pass `variables` object to `t()`. Do not use JS template literals in fallback strings for interpolation — the fallback must match the dictionary value format exactly.

---

## 5. Review Checklist

Before closing a task that adds text, verify:

1. Which exact category owns each new string?
2. Is any new user-facing product copy still hardcoded in a component/helper/template builder?
3. Does the source dictionary now contain the canonical English text?
4. Does the rendered surface read through localization lookup/runtime payload?
5. Did any internal-only text accidentally become user-localizable?
6. Were keys added to the **approved** source dictionary file (§4.5), not a legacy one?
7. Do template variables use `{name}` syntax in both the dictionary value and the fallback string?

If any answer is unclear, the task is not complete.

---

## 6. Non-Negotiable Invariants

1. Product-owned localizable copy is authored in bundled English dictionaries, not directly in UI components.
2. User-facing text and internal agent instructions must not share an implicit translation path.
3. New product surfaces must declare localization ownership during implementation, not as a later cleanup pass.
4. Release acceptance for UI work includes verifying that new text surfaces react to the correct localization category.

---

## 7. Related SSOT

- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
- `doc/SolidWorks-WorkFlow/Modules/Localization.md`
