#include "launcher_app.h"

#include "cef_browser.h"
#include "cef_command_line.h"
#include "include/views/cef_browser_view.h"
#include "include/views/cef_window.h"
#include "launcher_handler.h"
#include "wrapper/cef_helpers.h"

namespace {

class LauncherWindowDelegate : public CefWindowDelegate {
 public:
  LauncherWindowDelegate(CefRefPtr<CefBrowserView> browser_view,
                         cef_runtime_style_t runtime_style,
                         cef_show_state_t initial_state)
      : browser_view_(browser_view),
        runtime_style_(runtime_style),
        initial_state_(initial_state) {}

  void OnWindowCreated(CefRefPtr<CefWindow> window) override {
    window->AddChildView(browser_view_);
    window->Show();
  }

  void OnWindowDestroyed(CefRefPtr<CefWindow> window) override { browser_view_ = nullptr; }

  bool CanClose(CefRefPtr<CefWindow> window) override {
    CefRefPtr<CefBrowser> browser = browser_view_->GetBrowser();
    if (browser)
      return browser->GetHost()->TryCloseBrowser();
    return true;
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
    CefWindow::CreateTopLevelWindow(new LauncherWindowDelegate(
        popup_browser_view, runtime_style_, CEF_SHOW_STATE_NORMAL));
    return true;
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

  const bool use_views = !command_line->HasSwitch("use-native");
  const bool use_alloy = command_line->HasSwitch("use-alloy-style");
  cef_runtime_style_t runtime_style = use_alloy ? CEF_RUNTIME_STYLE_ALLOY : CEF_RUNTIME_STYLE_CHROME;

  CefRefPtr<LauncherHandler> handler(new LauncherHandler(use_views));

  CefBrowserSettings browser_settings;

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
        new LauncherWindowDelegate(browser_view, runtime_style, initial_state));
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
