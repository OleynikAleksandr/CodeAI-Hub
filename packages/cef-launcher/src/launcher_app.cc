#include "launcher_app.h"

#include <cstdio>

#include "cef_browser.h"
#include "cef_color_ids.h"
#include "cef_command_line.h"
#include "include/views/cef_browser_view.h"
#include "include/views/cef_view.h"
#include "include/views/cef_window.h"
#include "core_launcher.h"
#include "launcher_handler.h"
#include "wrapper/cef_helpers.h"

namespace {

const cef_color_t kProjectManagerBackgroundColor =
    CefColorSetARGB(255, 11, 13, 18);

void PaintViewDark(CefRefPtr<CefView> view) {
  if (view) {
    view->SetBackgroundColor(kProjectManagerBackgroundColor);
  }
}

void PaintBrowserViewDark(CefRefPtr<CefBrowserView> browser_view) {
  if (browser_view) {
    browser_view->SetBackgroundColor(kProjectManagerBackgroundColor);
  }
}

void PaintWindowDark(CefRefPtr<CefWindow> window, bool notify_views) {
  if (!window) {
    return;
  }
  window->SetThemeColor(CEF_ColorPrimaryBackground,
                        kProjectManagerBackgroundColor);
  window->SetBackgroundColor(kProjectManagerBackgroundColor);
  if (notify_views) {
    window->ThemeChanged();
  }
}

class LauncherWindowDelegate : public CefWindowDelegate {
 public:
  LauncherWindowDelegate(CefRefPtr<CefBrowserView> browser_view,
                         cef_runtime_style_t runtime_style,
                         cef_show_state_t initial_state,
                         bool is_popup_window)
      : browser_view_(browser_view),
        runtime_style_(runtime_style),
        initial_state_(initial_state),
        is_popup_window_(is_popup_window) {}

  void OnWindowCreated(CefRefPtr<CefWindow> window) override {
    PaintWindowDark(window, true);
    PaintBrowserViewDark(browser_view_);
    window->AddChildView(browser_view_);
    PaintBrowserViewDark(browser_view_);
    window->Show();
  }

  void OnThemeColorsChanged(CefRefPtr<CefWindow> window,
                            bool chrome_theme) override {
    static_cast<void>(chrome_theme);
    PaintWindowDark(window, false);
    PaintBrowserViewDark(browser_view_);
  }

  void OnThemeChanged(CefRefPtr<CefView> view) override {
    PaintViewDark(view);
    PaintBrowserViewDark(browser_view_);
  }

  void OnWindowClosing(CefRefPtr<CefWindow> window) override {
    if (!is_popup_window_) {
      return;
    }
    PaintWindowDark(window, false);
    PaintBrowserViewDark(browser_view_);
#if defined(__APPLE__)
    codeai::launcher::PrepareNativePopupWindowForClose(
        window->GetWindowHandle());
#endif
    window->Hide();
  }

  void OnWindowDestroyed(CefRefPtr<CefWindow> window) override { browser_view_ = nullptr; }

  bool CanClose(CefRefPtr<CefWindow> window) override {
    static_cast<void>(window);
#if defined(__APPLE__)
    if (is_popup_window_) {
      // Detached diagram popups are disposable auxiliary windows, not app
      // owners. Hide the native NSWindow before CEF starts its close path so
      // AppKit cannot animate a white backing frame as the last visible paint.
      codeai::launcher::PrepareNativePopupWindowForClose(
          window->GetWindowHandle());
      return true;
    }

    // Short-circuit the red window-close button into the native Cmd+Q
    // / Dock Quit code path. On macOS 26.x, Chromium 141's normal
    // TryCloseBrowser() teardown callback sends an AppKit-private
    // selector that no longer exists and crashes the process. Routing
    // through -[NSApplication terminate:] unwinds via -stop: and
    // avoids that buggy callback entirely (see BUG-2026-04-22-01 and
    // doc/SolidWorks-WorkFlow/Plans/Archive/CEF_MacOS_CanClose_ShortCircuit_Architecture.md).
    // Returning false keeps CefWindow from continuing its own close
    // path; -terminate: drives the orderly shutdown from here on.
    codeai::launcher::RequestNativeApplicationTermination();
    return false;
#else
    CefRefPtr<CefBrowser> browser = browser_view_->GetBrowser();
    if (browser)
      return browser->GetHost()->TryCloseBrowser();
    return true;
#endif
  }

  CefSize GetPreferredSize(CefRefPtr<CefView>) override { return CefSize(1024, 720); }

  cef_show_state_t GetInitialShowState(CefRefPtr<CefWindow>) override {
    return initial_state_;
  }

  cef_runtime_style_t GetWindowRuntimeStyle() override { return runtime_style_; }

 private:
  CefRefPtr<CefBrowserView> browser_view_;
  const cef_runtime_style_t runtime_style_;
  const cef_show_state_t initial_state_;
  const bool is_popup_window_;

  IMPLEMENT_REFCOUNTING(LauncherWindowDelegate);
  DISALLOW_COPY_AND_ASSIGN(LauncherWindowDelegate);
};

class LauncherBrowserViewDelegate : public CefBrowserViewDelegate {
 public:
  explicit LauncherBrowserViewDelegate(cef_runtime_style_t runtime_style)
      : runtime_style_(runtime_style) {}

  bool OnPopupBrowserViewCreated(CefRefPtr<CefBrowserView> browser_view,
                                 CefRefPtr<CefBrowserView> popup_browser_view,
                                 bool is_devtools) override {
    static_cast<void>(browser_view);
    static_cast<void>(is_devtools);
    CefWindow::CreateTopLevelWindow(new LauncherWindowDelegate(
        popup_browser_view, runtime_style_, CEF_SHOW_STATE_NORMAL, true));
    return true;
  }

  void OnThemeChanged(CefRefPtr<CefView> view) override {
    PaintViewDark(view);
  }

  cef_runtime_style_t GetBrowserRuntimeStyle() override { return runtime_style_; }

 private:
  const cef_runtime_style_t runtime_style_;

  IMPLEMENT_REFCOUNTING(LauncherBrowserViewDelegate);
  DISALLOW_COPY_AND_ASSIGN(LauncherBrowserViewDelegate);
};

}  // namespace

LauncherApp::LauncherApp() = default;

void LauncherApp::OnContextInitialized() {
  CEF_REQUIRE_UI_THREAD();

  CefRefPtr<CefCommandLine> command_line = CefCommandLine::GetGlobalCommandLine();

  codeai::launcher::LogLauncherInfo("Launcher context initialised");
  const std::string configPath = command_line->GetSwitchValue("config");
  if (!configPath.empty()) {
    codeai::launcher::RegisterWorkspaceFromConfig(configPath);
  }
  if (!codeai::launcher::EnsureCoreProcessRunning()) {
    codeai::launcher::LogLauncherError(
      "Standalone core bootstrap failed; UI will retry in background");
    std::fprintf(
        stderr,
        "CodeAIHubLauncher: standalone core bootstrap reported a failure; "
        "UI will retry connections in the background.\n");
  }

  codeai::launcher::StartCoreMonitoring();

  const bool use_views = !command_line->HasSwitch("use-native");
  const bool use_alloy = command_line->HasSwitch("use-alloy-style");
  cef_runtime_style_t runtime_style = use_alloy ? CEF_RUNTIME_STYLE_ALLOY : CEF_RUNTIME_STYLE_CHROME;

  CefRefPtr<LauncherHandler> handler(new LauncherHandler(use_views));

  CefBrowserSettings browser_settings;
  browser_settings.background_color = kProjectManagerBackgroundColor;

  std::string url = command_line->GetSwitchValue("url");
  if (url.empty()) {
    url = "about:blank";
  }

  if (use_views) {
    CefRefPtr<CefBrowserView> browser_view = CefBrowserView::CreateBrowserView(
        handler, url, browser_settings, nullptr, nullptr,
        new LauncherBrowserViewDelegate(runtime_style));

    cef_show_state_t initial_state = CEF_SHOW_STATE_NORMAL;
    const std::string state = command_line->GetSwitchValue("initial-show-state");
    if (state == "minimized") {
      initial_state = CEF_SHOW_STATE_MINIMIZED;
    } else if (state == "maximized") {
      initial_state = CEF_SHOW_STATE_MAXIMIZED;
    }

    CefWindow::CreateTopLevelWindow(
        new LauncherWindowDelegate(
            browser_view, runtime_style, initial_state, false));
  } else {
    CefWindowInfo window_info;
#if defined(_WIN32)
    window_info.SetAsPopup(nullptr, "CodeAI Hub");
#endif
    CefBrowserHost::CreateBrowser(window_info, handler, url, browser_settings,
                                  nullptr, nullptr);
  }
}

CefRefPtr<CefClient> LauncherApp::GetDefaultClient() {
  return LauncherHandler::GetInstance();
}
