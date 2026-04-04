# Claude Thinking Translation And Display Architecture

**Status:** Approved for execution (2026-04-04)
**Created:** 2026-04-04
**Owner:** Oleksandr + Codex
**Scope:** Fix Claude visible thinking so long reasoning blocks remain localized under non-English user settings and become readable in the dialog by rendering them in smaller chunks.

---

## 1. Problem

Release `1.1.882` fixed the general localization bootstrap, but Claude still has a provider-specific defect on long visible thinking blocks.

Observed live behavior:

- short Claude thinking bubbles may translate correctly;
- long Claude thinking bubbles still appear in English even when `Messages for the User = ru`;
- the same raw Claude session can contain a very large `thinking` block inside one `assistant` message;
- the current Claude translation adapter sends the whole reasoning block to Google GTX in one request;
- for long reasoning blocks, the generated Google GTX GET URL becomes too large and returns `400 Bad Request`;
- after fallback, the original English reasoning is emitted to the dialog;
- when a long reasoning block does arrive, it is rendered as one oversized bubble, which is difficult to read.

This is not only a prompt-language issue. It is a transport and presentation problem inside the Claude provider path.

---

## 2. Product Goal

When Claude emits visible reasoning under a non-English user language:

1. long reasoning blocks must still translate reliably;
2. translation failure must no longer be caused by single-request URL overflow for long text;
3. the dialog must display long reasoning in smaller readable chunks rather than one giant block;
4. short and final user-facing assistant replies must keep their current behavior;
5. the solution must remain compatible with the current runtime language contract (`messagesForTheUserLanguage`).

---

## 3. Non-Goals

This scope does not include:

- changing Claude prompt authoring rules;
- changing the meaning of `Artifacts for the User` or `Messages for the User`;
- redesigning the Project Manager chat UI;
- altering structured output contracts for Diagram Modules;
- changing the upstream Claude SDK transcript format.

---

## 4. Root Cause

Two separate issues are involved.

### 4.1. Translation transport failure for long reasoning

Current path:

- `ClaudeStreamEventRouter` extracts `thinking`;
- `ClaudeThoughtTranslationAdapter` calls `TranslationFacade.translate(...)`;
- the current runtime translation engine uses Google GTX with one GET request per translation;
- a long reasoning block can exceed safe request size;
- Google GTX returns `400`, so the translation falls back to the original English text.

This means the defect is deterministic for sufficiently long reasoning blocks.

### 4.2. Dialog readability problem

Current path:

- once a reasoning block is available, the Claude router emits it as one `dialog_message`;
- even if translation succeeds, a very large reasoning block remains hard to read in one bubble.

So the display path also needs an explicit chunking policy.

---

## 5. Core Decisions

### 5.1. Chunk long Claude thinking before translation

Long reasoning text must be translated in smaller units instead of one monolithic request.

Requirements:

- preserve reasoning order;
- prefer paragraph boundaries first;
- use sentence boundaries as fallback when a paragraph is still too large;
- fall back to word or hard splits only when no better boundary exists;
- keep translation local to the Claude provider path for now, because the confirmed regression is on Claude visible thinking.

### 5.2. Reassemble translated reasoning before display chunking

Translation chunking and dialog chunking are different concerns:

- translation chunking protects transport reliability;
- dialog chunking protects readability.

The provider should first reconstruct the translated reasoning text, then split it again into display-sized dialog chunks.

### 5.3. Emit multiple thinking dialog messages for oversized reasoning

Claude visible thinking should render as several `dialog_message` items when the content is too large.

Rules:

- keep `tag: "thinking"` on every emitted chunk;
- preserve chunk order;
- assign stable per-chunk UUID suffixes;
- do not change short reasoning behavior when a single bubble is already readable.

### 5.4. Keep final assistant replies on the existing path

The chunked thinking behavior must not change:

- final assistant replies;
- structured output parsing;
- pre-tool assistant text handling already tied to `message_delta.stop_reason`.

This scope only changes visible Claude `thinking`.

---

## 6. Target Architecture

### 6.1. `ClaudeThoughtTranslationAdapter`

Responsibilities after this refactor:

- detect when the source reasoning is too large for a single translation request;
- split it into ordered translation chunks;
- translate chunks independently;
- join the translated chunks back into one localized reasoning string;
- return `null` only when the chunked translation path still cannot produce a usable localized result.

### 6.2. `ClaudeStreamEventRouter`

Responsibilities after this refactor:

- keep the current extraction of Claude `thinking` blocks;
- translate the full reasoning through the adapter;
- split the resulting visible reasoning into display-sized readable chunks;
- emit one `dialog_message` per readable chunk.

### 6.3. Tests

Target regression coverage:

- long Claude reasoning is translated through multiple chunk requests;
- long visible reasoning emits multiple `dialog_message` thinking bubbles;
- short reasoning keeps current behavior;
- final non-thinking assistant replies remain untouched.

---

## 7. Risks And Mitigations

### 7.1. Mixed-language output if only some chunks translate

Risk:

- partial translation may produce awkward mixed-language reasoning.

Mitigation:

- require a usable translation result for the chunked reasoning path before emitting localized content;
- if the chunked path fails completely, fall back to the original text as today.

### 7.2. Over-fragmented dialog

Risk:

- too many tiny thinking bubbles become noisy.

Mitigation:

- split by paragraph first;
- aggregate sentence groups up to a readable target size;
- emit multiple bubbles only when one bubble would be oversized.

### 7.3. Scope creep into other providers

Risk:

- the same transport issue may exist in Gemini/Codex.

Mitigation:

- document the root cause here;
- implement the confirmed Claude fix first;
- evaluate later whether the translation chunking policy should move down into the shared translation package.

---

## 8. Execution Shape

Implementation should proceed in these stages:

1. planning doc + phased `todo-plan`;
2. Claude translation chunking for long reasoning;
3. Claude dialog chunking for visible thinking bubbles;
4. targeted tests and build verification;
5. documentation + release packaging.

The already requested Project Manager help-text visual tweak may ride the same release as a separate non-architectural tail.
