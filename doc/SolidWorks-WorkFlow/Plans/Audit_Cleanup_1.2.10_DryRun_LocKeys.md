# 1.2.10 Localization Cleanup — Dry-Run Report

Generated from approved dicts: ui_labels, ui_helper_text, messages_for_the_user, artifacts_for_the_user.json
Total keys scanned: 278
- Alive (exact match in code): **204**
- Suspicious (partial match only — possible dynamic key): **67**
- Certainly dead (zero traces in code): **7**

## Methodology
For each key `a.b.c`:
1. `rg -F 'a.b.c'` excluding assets/localization, dist, **/*.json, doc, node_modules.
2. If no exact hit, try parent prefix `rg -F 'a.b.'` (catches dynamic template-literal keys).
3. If no parent hit, try last segment `rg -F '.c'`.
4. All three zero → certainly dead. Any partial hit → suspicious.

## Certainly dead — safe to delete in Stream 4

### ui_labels.json (2 keys)

- `settings.localization.workflow_terms_policy.keep_english_label`
- `settings.localization.workflow_terms_policy.translate_label`

### ui_helper_text.json (5 keys)

- `settings.localization.do_not_translate_terms.validation.latin_letter`
- `settings.localization.do_not_translate_terms.validation.reserved_sequence`
- `settings.localization.do_not_translate_terms.validation.too_long`
- `settings.localization.workflow_terms_policy.keep_english_description`
- `settings.localization.workflow_terms_policy.translate_description`

## Suspicious — keep, manual review before deletion

### ui_labels.json (14 keys)

- `pm.confirmation_card.title.diagram_modules` | parent-hits: src/client/project-manager/components/shared/stage-confirmation-card.tsx | last-seg-hits: src/client/project-manager/services/workflow-step-start-service.ts, src/client/project-manager/components/diagram-modules/diagram-modules-help.tsx
- `pm.confirmation_card.title.virtual_simulation` | parent-hits: src/client/project-manager/components/shared/stage-confirmation-card.tsx | last-seg-hits: src/client/project-manager/components/virtual-simulation/virtual-simulation-help.tsx, src/client/project-manager/components/shared/stage-confirmation-card.tsx
- `settings.localization.category.interactive_templates.label` | parent-hits: — | last-seg-hits: media/react-chat.js, src/client/project-manager/components/layout/main-area-utils.ts
- `settings.localization.category.system_feedback.label` | parent-hits: — | last-seg-hits: media/react-chat.js, src/client/project-manager/components/diagram-editor/use-diagram-loader.ts
- `settings.localization.category.ui_interface.label` | parent-hits: — | last-seg-hits: src/client/project-manager/components/layout/main-area-utils.ts, src/client/project-manager/components/diagram-editor/use-diagram-loader.ts
- `settings.localization.category.user_guidance.label` | parent-hits: — | last-seg-hits: media/react-chat.js, src/client/project-manager/components/layout/main-area-utils.ts
- `settings.localization.category.workflow_terms.label` | parent-hits: — | last-seg-hits: media/react-chat.js, src/client/project-manager/components/diagram-editor/use-diagram-loader.ts
- `settings.localization.default_language.label` | parent-hits: media/react-chat.js, src/client/ui/src/components/settings/localization-settings-card.tsx | last-seg-hits: media/react-chat.js, src/extension-module/cef/runtime-files.ts
- `settings.localization.do_not_translate_terms.cancel_edit_label` | parent-hits: media/react-chat.js, src/client/ui/src/components/settings/localization-glossary-editor.tsx | last-seg-hits: —
- `settings.localization.do_not_translate_terms.edit_term_label` | parent-hits: media/react-chat.js, src/client/ui/src/components/settings/localization-glossary-editor.tsx | last-seg-hits: —
- `settings.localization.do_not_translate_terms.english_term_label` | parent-hits: media/react-chat.js, src/client/ui/src/components/settings/localization-glossary-editor.tsx | last-seg-hits: —
- `settings.localization.do_not_translate_terms.remove_term_label` | parent-hits: media/react-chat.js, src/client/ui/src/components/settings/localization-glossary-editor.tsx | last-seg-hits: —
- `settings.localization.do_not_translate_terms.save_term_label` | parent-hits: media/react-chat.js, src/client/ui/src/components/settings/localization-glossary-editor.tsx | last-seg-hits: —
- `settings.localization.workflow_terms_policy.label` | parent-hits: — | last-seg-hits: media/react-chat.js, src/client/project-manager/components/layout/main-area-utils.ts

### ui_helper_text.json (26 keys)

- `pm.confirmation_card.blocked.diagram_modules` | parent-hits: src/client/project-manager/components/shared/stage-confirmation-card.tsx | last-seg-hits: src/client/project-manager/services/workflow-step-start-service.ts, src/client/project-manager/components/diagram-modules/diagram-modules-help.tsx
- `pm.confirmation_card.blocked.virtual_simulation` | parent-hits: src/client/project-manager/components/shared/stage-confirmation-card.tsx | last-seg-hits: src/client/ui/src/services/idea-collector-artifact.ts, src/client/ui/src/services/idea-collector-fallback-schema.ts
- `settings.claude_default_model.option.haiku.description` | parent-hits: — | last-seg-hits: src/client/project-manager/services/workflow-state-helpers.ts, src/client/project-manager/services/workflow-step-start-service.ts
- `settings.claude_default_model.option.opus.description` | parent-hits: — | last-seg-hits: src/client/project-manager/services/workflow-state-helpers.ts, src/client/project-manager/services/workflow-step-start-service.ts
- `settings.claude_default_model.option.sonnet.description` | parent-hits: — | last-seg-hits: src/client/project-manager/services/workflow-state-helpers.ts, src/client/project-manager/services/workflow-step-start-service.ts
- `settings.claude_thinking_settings.effort.high_description` | parent-hits: media/react-chat.js, src/client/ui/src/components/settings/thinking/thinking-effort-selector.tsx | last-seg-hits: —
- `settings.claude_thinking_settings.effort.low_description` | parent-hits: media/react-chat.js, src/client/ui/src/components/settings/thinking/thinking-effort-selector.tsx | last-seg-hits: —
- `settings.claude_thinking_settings.effort.max_description` | parent-hits: media/react-chat.js, src/client/ui/src/components/settings/thinking/thinking-effort-selector.tsx | last-seg-hits: —
- `settings.claude_thinking_settings.effort.medium_description` | parent-hits: media/react-chat.js, src/client/ui/src/components/settings/thinking/thinking-effort-selector.tsx | last-seg-hits: —
- `settings.claude_thinking_settings.effort.xhigh_description` | parent-hits: media/react-chat.js, src/client/ui/src/components/settings/thinking/thinking-effort-selector.tsx | last-seg-hits: —
- `settings.codex_default_model.option.gpt-5.3-codex.description` | parent-hits: — | last-seg-hits: src/client/project-manager/services/workflow-state-helpers.ts, src/client/project-manager/services/workflow-step-start-service.ts
- `settings.codex_default_model.option.gpt-5.4-mini.description` | parent-hits: — | last-seg-hits: src/client/project-manager/services/workflow-state-helpers.ts, src/client/project-manager/services/workflow-step-start-service.ts
- `settings.codex_default_model.option.gpt-5.4.description` | parent-hits: — | last-seg-hits: src/client/project-manager/services/workflow-state-helpers.ts, src/client/project-manager/services/workflow-step-start-service.ts
- `settings.gemini_default_model.option.gemini-3-flash-preview.description` | parent-hits: — | last-seg-hits: src/client/project-manager/services/workflow-state-helpers.ts, src/client/project-manager/services/workflow-step-start-service.ts
- `settings.gemini_default_model.option.gemini-3.1-pro-preview.description` | parent-hits: — | last-seg-hits: src/client/project-manager/services/workflow-state-helpers.ts, src/client/project-manager/services/workflow-step-start-service.ts
- `settings.localization.category.interactive_templates.description` | parent-hits: — | last-seg-hits: src/client/project-manager/services/workflow-state-helpers.ts, src/client/project-manager/services/workflow-step-start-service.ts
- `settings.localization.category.system_feedback.description` | parent-hits: — | last-seg-hits: src/client/project-manager/services/workflow-state-helpers.ts, src/client/project-manager/services/workflow-step-start-service.ts
- `settings.localization.category.ui_interface.description` | parent-hits: — | last-seg-hits: src/client/project-manager/services/workflow-state-helpers.ts, src/client/project-manager/services/workflow-step-start-service.ts
- `settings.localization.category.user_guidance.description` | parent-hits: — | last-seg-hits: src/client/project-manager/services/workflow-state-helpers.ts, src/client/project-manager/services/workflow-step-start-service.ts
- `settings.localization.category.workflow_terms.description` | parent-hits: — | last-seg-hits: src/client/project-manager/services/workflow-state-helpers.ts, src/client/project-manager/services/workflow-step-start-service.ts
- `settings.localization.default_language.description` | parent-hits: media/react-chat.js, src/client/ui/src/components/settings/localization-settings-card.tsx | last-seg-hits: src/client/project-manager/services/workflow-state-helpers.ts, src/client/project-manager/services/workflow-step-start-service.ts
- `settings.localization.do_not_translate_terms.placeholder` | parent-hits: media/react-chat.js, src/client/ui/src/components/settings/localization-glossary-editor.tsx | last-seg-hits: src/client/project-manager/components/description/description-questionnaire-panel.tsx, packages/Claude_Module/src/translation/claude-haiku-translation-service.ts
- `settings.localization.do_not_translate_terms.validation.duplicate` | parent-hits: — | last-seg-hits: src/client/ui/src/modules/drag-drop-module/file-path-processor.ts
- `settings.localization.do_not_translate_terms.validation.empty` | parent-hits: — | last-seg-hits: media/react-chat.js, src/client/project-manager/components/layout/workspace-tree.tsx
- `settings.localization.language_catalog_helper` | parent-hits: media/react-chat.js, src/client/ui/src/components/settings/localization-settings-card.tsx | last-seg-hits: —
- `settings.localization.workflow_terms_policy.description` | parent-hits: — | last-seg-hits: src/client/project-manager/services/workflow-state-helpers.ts, src/client/project-manager/services/workflow-step-start-service.ts

### artifacts_for_the_user.json (27 keys)

- `pm.description.questionnaire.aria_label` | parent-hits: src/client/project-manager/components/description/description-questionnaire-panel.tsx | last-seg-hits: —
- `pm.description.questionnaire.field.boundaries_draft.title` | parent-hits: — | last-seg-hits: src/client/project-manager/services/description-questionnaire-utils.ts, src/client/project-manager/services/workflow-state-client.ts
- `pm.description.questionnaire.field.boundaries_draft.title_hint` | parent-hits: — | last-seg-hits: src/client/project-manager/components/description/description-questionnaire-panel.tsx
- `pm.description.questionnaire.field.constraints.title` | parent-hits: — | last-seg-hits: src/client/project-manager/services/description-questionnaire-utils.ts, src/client/project-manager/services/workflow-state-client.ts
- `pm.description.questionnaire.field.constraints.title_hint` | parent-hits: — | last-seg-hits: src/client/project-manager/components/description/description-questionnaire-panel.tsx
- `pm.description.questionnaire.field.key_functions.title` | parent-hits: — | last-seg-hits: src/client/project-manager/services/description-questionnaire-utils.ts, src/client/project-manager/services/workflow-state-client.ts
- `pm.description.questionnaire.field.key_functions.title_hint` | parent-hits: — | last-seg-hits: src/client/project-manager/components/description/description-questionnaire-panel.tsx
- `pm.description.questionnaire.field.meta_title.title` | parent-hits: — | last-seg-hits: src/client/project-manager/services/description-questionnaire-utils.ts, src/client/project-manager/services/workflow-state-client.ts
- `pm.description.questionnaire.field.meta_title.title_hint` | parent-hits: — | last-seg-hits: src/client/project-manager/components/description/description-questionnaire-panel.tsx
- `pm.description.questionnaire.field.modules_draft.title` | parent-hits: — | last-seg-hits: src/client/project-manager/services/description-questionnaire-utils.ts, src/client/project-manager/services/workflow-state-client.ts
- `pm.description.questionnaire.field.modules_draft.title_hint` | parent-hits: — | last-seg-hits: src/client/project-manager/components/description/description-questionnaire-panel.tsx
- `pm.description.questionnaire.field.notes.title` | parent-hits: — | last-seg-hits: src/client/project-manager/services/description-questionnaire-utils.ts, src/client/project-manager/services/workflow-state-client.ts
- `pm.description.questionnaire.field.notes.title_hint` | parent-hits: — | last-seg-hits: src/client/project-manager/components/description/description-questionnaire-panel.tsx
- `pm.description.questionnaire.field.out_of_scope.title` | parent-hits: — | last-seg-hits: src/client/project-manager/services/description-questionnaire-utils.ts, src/client/project-manager/services/workflow-state-client.ts
- `pm.description.questionnaire.field.out_of_scope.title_hint` | parent-hits: — | last-seg-hits: src/client/project-manager/components/description/description-questionnaire-panel.tsx
- `pm.description.questionnaire.field.pre_read_documents.title` | parent-hits: — | last-seg-hits: src/client/project-manager/services/description-questionnaire-utils.ts, src/client/project-manager/services/workflow-state-client.ts
- `pm.description.questionnaire.field.pre_read_documents.title_hint` | parent-hits: — | last-seg-hits: src/client/project-manager/components/description/description-questionnaire-panel.tsx
- `pm.description.questionnaire.field.problem_and_goals.title` | parent-hits: — | last-seg-hits: src/client/project-manager/services/description-questionnaire-utils.ts, CHANGELOG.md
- `pm.description.questionnaire.field.problem_and_goals.title_hint` | parent-hits: — | last-seg-hits: src/client/project-manager/components/description/description-questionnaire-panel.tsx
- `pm.description.questionnaire.field.project_stack.title` | parent-hits: — | last-seg-hits: src/client/project-manager/services/description-questionnaire-utils.ts, src/client/project-manager/services/workflow-state-client.ts
- `pm.description.questionnaire.field.project_stack.title_hint` | parent-hits: — | last-seg-hits: src/client/project-manager/components/description/description-questionnaire-panel.tsx
- `pm.description.questionnaire.field.short_description.title` | parent-hits: — | last-seg-hits: src/client/project-manager/services/description-questionnaire-utils.ts, src/client/project-manager/services/workflow-state-client.ts
- `pm.description.questionnaire.field.short_description.title_hint` | parent-hits: — | last-seg-hits: src/client/project-manager/components/description/description-questionnaire-panel.tsx
- `pm.description.questionnaire.field.user_scenarios.title` | parent-hits: — | last-seg-hits: src/client/project-manager/services/description-questionnaire-utils.ts, src/client/project-manager/services/workflow-state-client.ts
- `pm.description.questionnaire.field.user_scenarios.title_hint` | parent-hits: — | last-seg-hits: src/client/project-manager/components/description/description-questionnaire-panel.tsx
- `pm.description.questionnaire.field.users.title` | parent-hits: — | last-seg-hits: src/client/project-manager/services/description-questionnaire-utils.ts, src/client/project-manager/services/workflow-state-client.ts
- `pm.description.questionnaire.field.users.title_hint` | parent-hits: — | last-seg-hits: src/client/project-manager/components/description/description-questionnaire-panel.tsx
