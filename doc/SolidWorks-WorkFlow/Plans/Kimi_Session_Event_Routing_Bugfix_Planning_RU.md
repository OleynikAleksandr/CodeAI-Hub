# Kimi Session Event Routing Bugfix Planning

**Status:** active implementation planning
**Date:** 2026-06-23
**Owner:** Codex

## Problem

Two standalone Kimi chats can receive the same provider output. The observed
workspace `/Users/oleksandroliinyk/VSCODE/Test_png` has two Kimi session logs:

- `kimi-session-fb780c87-fd12-48eb-af2e-81b022fa3958.jsonl`
- `kimi-session-8e221462-dfb2-479d-95c5-ab12f6bbc9ad.jsonl`

The first chat correctly contains the image-reading turn for
`/Users/oleksandroliinyk/VSCODE/Test_png/AGENTS.png`, then incorrectly contains
the second chat's messages for `/Users/oleksandroliinyk/VSCODE/Test_md/AGENTS.md`.
The token usage was not duplicated because post-turn token usage is dispatched
from the concrete `sendMessage(sessionId, ...)` path.

## Cause

`KimiProviderAdapter.createWireRouter().onEvent` normalizes every Kimi ACP wire
event and broadcasts it to every currently subscribed Kimi listener. ACP
`session/update` frames include `params.sessionId`, so the adapter should route
those events to the matching runtime listener `kimi:<providerSessionId>` instead
of every open Kimi chat.

The provider request path has the same broadcast shape for ACP client requests.
It should use `request.params.sessionId` when present, with the existing
broadcast behavior kept only as a fallback for frames that do not identify a
session.

## Cross-provider Check

Checked provider adapters for the same class of bug:

- `GLM_Module`: emits only to `listeners.get(sessionId)`.
- `GLM_OpenCode_Module`: emits only to `listeners.get(sessionId)`.
- `Gemini_Module`: forwards events from the concrete active session emitter and
  dispatches only to the current session id, with explicit id reassign handling.
- `Claude_Module`: binds events per `ActiveSession` and dispatches through a
  single resolved session id / alias.
- `Codex_AppServer_Module`: extracts `threadId` from app-server notifications
  before emitting to the matching session state; account usage-limit updates are
  intentionally replayed to all Codex threads.
- `LocalModels`: emits only to `listenersBySessionId.get(sessionId)`.

No Kimi-style unqualified provider event broadcast was found in those adapters.

## Implementation

Smallest working change:

1. Add a private session-id extractor in `KimiProviderAdapter`.
2. Route normalized wire events and provider requests to `kimi:<providerSessionId>`
   when the frame contains a provider session id.
3. Keep the old broadcast only when no target session id can be read.
4. Add a focused regression test with two listeners proving an ACP
   `session/update` for `session-2` does not reach `kimi:session-1`.
5. Document the Kimi routing invariant in `Modules/Kimi.md`.

No UI changes, no new shared abstraction, no new dependency.
