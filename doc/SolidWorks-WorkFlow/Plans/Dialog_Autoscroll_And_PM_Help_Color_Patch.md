# Dialog Autoscroll And PM Help Color Patch

**Status:** Approved for execution (2026-04-04)
**Created:** 2026-04-04
**Owner:** Oleksandr + Codex
**Scope:** Fix the dialog auto-scroll regression where a growing last `Thinking` bubble stops below the viewport, and retune Project Manager help-text color to the newly requested token.

---

## 1. Problem

Release `1.1.884` fixed Claude same-message thinking classification, but one dialog UX defect remains.

Observed behavior:

- when a new dialog bubble is appended, the scroll container auto-scrolls correctly;
- when the last visible bubble grows in place because streaming text is appended to the same logical message, the viewport does not follow the new bottom edge;
- this is most visible on provider `Thinking` output, where more text arrives into the already visible bubble and the user must scroll manually.

At the same time, Project Manager help/spravka copy needs one more visual retune:

- previous token: `rgba(100, 130, 155, 1)`;
- new requested token: `rgba(115, 130, 140, 1)`.

---

## 2. Root Cause

Current dialog auto-scroll logic in the shared browser session panel tracks only:

- whether the user is pinned to the bottom;
- and the total count of rendered messages.

That means the auto-scroll effect runs when a new message is added, but not when the last rendered message keeps the same id/count and only its `content` grows. Streaming provider output therefore extends below the visible viewport while `pinnedToBottom` still says `true`.

---

## 3. Decision

Keep the current pinned-to-bottom behavior, but change the auto-scroll trigger from "message count only" to "bottom anchor changed".

The bottom anchor must change when:

- the number of display messages changes;
- or the last display message changes identity;
- or the last display message content changes while keeping the same identity.

Non-goals:

- do not auto-scroll when the user intentionally scrolled away from the bottom;
- do not introduce text heuristics for provider-specific messages;
- do not move PM help typography away from the already accepted size/weight contract (`14px`, medium).

---

## 4. Target Change

### 4.1. Dialog bottom-anchor fingerprint

Add a small pure helper that derives a deterministic bottom-anchor fingerprint from the merged display messages. The fingerprint must change when the last rendered bubble content changes, even if message count stays the same.

### 4.2. Shared dialog panel effect

Use that fingerprint in the scroll effect dependency. If the user is still pinned to the bottom, the dialog must set `scrollTop = scrollHeight` whenever the bottom anchor changes.

### 4.3. Regression coverage

Add a focused unit test for the bottom-anchor helper so the "same count, larger last bubble" case stays explicit.

### 4.4. PM help color token

Update only the PM CSS variable:

- `--pm-help-text-color: rgba(115, 130, 140, 1);`

No other typography tokens should change.

---

## 5. Verification

1. `npm run build:webview`
2. `node --test out/client/ui/src/session/dialog-panel-scroll-anchor.test.js`
3. `npm run build:project-manager`
4. Full release pass:
   - `./scripts/build-all.sh`
   - `./scripts/build-release.sh --use-current-version`
