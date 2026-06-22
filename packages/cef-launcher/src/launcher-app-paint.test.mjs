import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sourcePath = new URL("./launcher_app.cc", import.meta.url);
const macSourcePath = new URL(
  "./platform/mac/launcher_handler_mac.mm",
  import.meta.url
);
const windowBackgroundPattern =
  /window->SetBackgroundColor\(kProjectManagerBackgroundColor\)/u;
const themeColorsChangedPattern =
  /void OnThemeColorsChanged\(CefRefPtr<CefWindow> window,/u;
const paintWindowAfterThemeResetPattern = /PaintWindowDark\(window, false\)/u;
const themeChangedPattern =
  /void OnThemeChanged\(CefRefPtr<CefView> view\) override/u;
const paintViewPattern = /PaintViewDark\(view\)/u;
const windowClosingPattern =
  /void OnWindowClosing\(CefRefPtr<CefWindow> window\) override/u;
const popupWindowGuardPattern = /if \(!is_popup_window_\)/u;
const hideWindowPattern = /window->Hide\(\)/u;
const nativeClosePattern = /PrepareNativePopupWindowForClose/u;
const nativeOrderOutPattern = /\[window orderOut:nil\]/u;
const nativeAnimationNonePattern = /NSWindowAnimationBehaviorNone/u;

test("launcher paints CEF views before showing windows", async () => {
  const source = await readFile(sourcePath, "utf8");
  const body = source.slice(
    source.indexOf("void OnWindowCreated"),
    source.indexOf("void OnWindowDestroyed")
  );

  const themeIndex = body.indexOf("PaintWindowDark");
  const viewIndex = body.indexOf("PaintBrowserViewDark");
  const addIndex = body.indexOf("window->AddChildView");
  const showIndex = body.indexOf("window->Show");

  assert.ok(themeIndex !== -1, "window theme background must be set");
  assert.ok(viewIndex !== -1, "browser view background must be set");
  assert.ok(
    themeIndex < addIndex,
    "window theme must be set before attaching view"
  );
  assert.ok(
    viewIndex < addIndex,
    "browser view must be painted before attaching"
  );
  assert.ok(
    addIndex < showIndex,
    "window must be shown after the painted view"
  );
});

test("launcher keeps popup paint dark after CEF theme resets", async () => {
  const source = await readFile(sourcePath, "utf8");

  assert.match(source, windowBackgroundPattern);
  assert.match(source, themeColorsChangedPattern);
  assert.match(source, paintWindowAfterThemeResetPattern);
  assert.match(source, themeChangedPattern);
  assert.match(source, paintViewPattern);
});

test("launcher hides popup windows before teardown", async () => {
  const source = await readFile(sourcePath, "utf8");
  const body = source.slice(
    source.indexOf("void OnWindowClosing"),
    source.indexOf("void OnWindowDestroyed")
  );

  assert.match(source, windowClosingPattern);
  assert.match(body, popupWindowGuardPattern);
  assert.match(body, paintWindowAfterThemeResetPattern);
  assert.match(body, nativeClosePattern);
  assert.match(body, hideWindowPattern);
});

test("launcher prepares popup native windows before allowing close", async () => {
  const source = await readFile(sourcePath, "utf8");
  const body = source.slice(
    source.indexOf("bool CanClose"),
    source.indexOf("CefSize GetPreferredSize")
  );
  const popupBody = body.slice(
    body.indexOf("if (is_popup_window_)"),
    body.indexOf("RequestNativeApplicationTermination")
  );

  const nativeCloseIndex = popupBody.indexOf(
    "PrepareNativePopupWindowForClose"
  );
  const returnTrueIndex = popupBody.indexOf("return true");

  assert.ok(nativeCloseIndex !== -1, "native popup close prep must run");
  assert.ok(
    returnTrueIndex !== -1,
    "popup close branch must allow local close"
  );
  assert.ok(
    nativeCloseIndex < returnTrueIndex,
    "native popup must be hidden before CEF is allowed to close it"
  );
});

test("launcher orders native macOS popup windows out before teardown", async () => {
  const source = await readFile(macSourcePath, "utf8");

  assert.match(source, nativeClosePattern);
  assert.match(source, nativeAnimationNonePattern);
  assert.match(source, nativeOrderOutPattern);
});
