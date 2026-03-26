# ThoughtTranslation: Google Translate Migration

**Status:** Approved
**Created:** 2026-03-26
**Owner:** Oleksandr
**Implements:** Phase 74 in `doc/TODO/todo-plan.md`

---

## 1. Problem Statement

### 1.1. Three confirmed defects in ThoughtTranslator pipeline

**Defect A — Wrong roles in JSONL:**
Each Gemini thought produces TWO records in the infinite session JSONL:
- `role: "thinking"` — original English thought from SDK
- `role: "assistant"` — Russian translation from Flash-Lite

The translation is indistinguishable from a real agent response.

**Defect B — Flash-Lite chain-of-thought leakage:**
Flash-Lite (gemini-2.5-flash-lite) sometimes outputs its own reasoning instead of a clean translation:
```
"My refined draft became: \"Читаю файл для проверки...\". I felt this version
successfully encapsulated all the essential actions..."
```
`extractFinalTranslation()` cannot filter single-paragraph reasoning.

**Defect C — Race condition / message ordering:**
Translation is fire-and-forget async (1–71 seconds latency). Real assistant responses can arrive before the translation completes, causing out-of-order JSONL records:
```
thinking: english #1
thinking: english #2
assistant: real answer       ← arrived first
assistant: translation #1   ← late arrival, after real answer
assistant: translation #2   ← even later
```

### 1.2. Evidence from JSONL

Session file: `~/.codeai-hub/sessions/.../gemini-c740333d-...-virtual-simulation.jsonl`

| Line | Timestamp | Role | Content | Source |
|------|-----------|------|---------|--------|
| 24 | 11:28:01.106Z | thinking | "Reformatting Scenario Headings..." | Gemini SDK |
| 25 | 11:28:01.112Z | assistant | "Я перечитаю файл..." | Flash-Lite (good) |
| 26 | 11:28:07.191Z | assistant | "My refined draft became: \"Читаю файл...\" I felt..." | Flash-Lite (broken) |

Measured latencies: 6ms to 71 seconds per translation.

---

## 2. Solution: Google Translate API + `tag` field + buffered emit

### 2.1. Replace Flash-Lite with Google Translate API

Use the free Google Translate endpoint (no API key, no auth):
```
GET https://translate.googleapis.com/translate_a/single
    ?client=gtx&sl=en&tl=ru&dt=t&q=<text>
```

**Advantages over Flash-Lite:**
- Latency: ~100ms vs 1-71 seconds
- Quality: deterministic translation, no chain-of-thought leakage
- Cost: free (no Gemini API quota consumed)
- Reliability: no prompt engineering, no output filtering needed
- No dependencies: single `fetch()` call

### 2.2. Add optional `tag` field to SessionMessage

```typescript
export type SessionMessage = {
  readonly id: string;
  readonly role: SessionMessageRole;
  readonly content: string;
  readonly createdAt: number;
  readonly tag?: string;  // NEW: optional semantic tag
};
```

For translated thoughts: `tag: "thinking"`.

**Backward compatible:** old records without `tag` work unchanged.

### 2.3. Buffered emit in MessageProcessor

Instead of two separate emits (thinking + translation), buffer and emit once:

1. `handleThoughtEvent()` — do NOT emit immediately
2. Start translation (now ~100ms with Google Translate)
3. On success → `emitDialogMessage("assistant", russian, { tag: "thinking" })`
4. On failure → `emitDialogMessage("assistant", english_original, { tag: "thinking" })`
5. Before `handleFinishedEvent()` → `await Promise.allSettled(pendingTranslations)`
6. Only then emit the real assistant response

### 2.4. UI rendering

`resolveRoleLabel()` change:
```typescript
if (message.role === "assistant" && message.tag === "thinking") {
  return providerLabel ? `${providerLabel} · Thinking` : "Thinking";
}
```

Tagged messages render as `StandardMessage` (visible, with timestamp) — not collapsed `ThinkingMessage`.

### 2.5. JSONL result (single record per thought)

Before:
```jsonl
{"role":"thinking","content":"Reformatting Scenario..."}
{"role":"assistant","content":"Переформатирование заголовков..."}
```

After:
```jsonl
{"role":"assistant","content":"Переформатирование заголовков...","tag":"thinking"}
{"role":"assistant","content":"Вот исправленный документ..."}
```

---

## 3. Scope: Gemini only

This change applies exclusively to the Gemini Module.
Claude and Codex thinking events (if any) remain unchanged.

---

## 4. Files affected

| File | Change |
|------|--------|
| `packages/Gemini_Module/src/messaging/thought-translator-service.ts` | Full rewrite: Flash-Lite → Google Translate API |
| `packages/Gemini_Module/src/messaging/message-processor.ts` | Buffered emit, pending translations, tag in payload |
| `packages/Gemini_Module/src/session/gemini-session-manager.ts` | Remove Flash-Lite binding (ensureThoughtTranslatorBound) |
| `packages/core/src/session-manager/index.ts` | Add `tag?: string` to SessionMessage type |
| `packages/core/src/remote-bridge/handlers/session-request-handler.ts` | Add `tag` to DialogMessagePayload + appendDialogMessage |
| `src/types/session.ts` | Add `tag?: string` to UI SessionMessage type |
| `src/client/ui/src/session/dialog-panel-message-utils.ts` | resolveRoleLabel: handle tag="thinking" |
| `src/client/ui/src/session/dialog-panel.tsx` | Routing: tagged assistant → StandardMessage |

---

## 5. Non-goals

- Cloud Translation API v2 with auth (not needed for this volume)
- Translating thoughts for Claude/Codex
- Changing the `ThinkingMessage` component itself (remains for non-Gemini)
- Persistent model override (out of MVP scope)
