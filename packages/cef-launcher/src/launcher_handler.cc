#include "launcher_handler.h"

#include <sstream>
#include <string>

#include "base/cef_callback.h"
#include "cef_app.h"
#include "cef_parser.h"
#include "include/views/cef_browser_view.h"
#include "include/views/cef_window.h"
#include "wrapper/cef_closure_task.h"
#include "wrapper/cef_helpers.h"

namespace {

LauncherHandler* g_handler_instance = nullptr;

std::string ToDataUri(const std::string& data, const std::string& mime_type) {
  return "data:" + mime_type + ";base64," +
         CefURIEncode(CefBase64Encode(data.data(), data.size()), false)
             .ToString();
}

}  // namespace

LauncherHandler::LauncherHandler(bool use_views_style)
    : use_views_style_(use_views_style) {
  DCHECK(!g_handler_instance);
  g_handler_instance = this;
}

LauncherHandler::~LauncherHandler() {
  g_handler_instance = nullptr;
}

// static
LauncherHandler* LauncherHandler::GetInstance() {
  return g_handler_instance;
}

void LauncherHandler::OnTitleChange(CefRefPtr<CefBrowser> browser,
                                    const CefString& title) {
  CEF_REQUIRE_UI_THREAD();

  if (auto browser_view = CefBrowserView::GetForBrowser(browser)) {
    if (auto window = browser_view->GetWindow()) {
      window->SetTitle(title);
    }
  } else if (use_views_style_) {
    PlatformTitleChange(browser, title);
  }
}

void LauncherHandler::OnAfterCreated(CefRefPtr<CefBrowser> browser) {
  CEF_REQUIRE_UI_THREAD();
  browser_list_.push_back(browser);
}

bool LauncherHandler::DoClose(CefRefPtr<CefBrowser> browser) {
  CEF_REQUIRE_UI_THREAD();
  if (browser_list_.size() == 1) {
    is_closing_ = true;
  }
  return false;
}

void LauncherHandler::OnBeforeClose(CefRefPtr<CefBrowser> browser) {
  CEF_REQUIRE_UI_THREAD();

  for (auto it = browser_list_.begin(); it != browser_list_.end(); ++it) {
    if ((*it)->IsSame(browser)) {
      browser_list_.erase(it);
      break;
    }
  }

  if (browser_list_.empty()) {
    CefQuitMessageLoop();
  }
}

void LauncherHandler::OnLoadError(CefRefPtr<CefBrowser> browser,
                                  CefRefPtr<CefFrame> frame,
                                  ErrorCode error_code,
                                  const CefString& error_text,
                                  const CefString& failed_url) {
  CEF_REQUIRE_UI_THREAD();

  if (!use_views_style_) {
    return;
  }

  if (error_code == ERR_ABORTED) {
    return;
  }

  std::stringstream ss;
  ss << "<html><body bgcolor=\"white\">"
        "<h2>Failed to load URL "
     << failed_url.ToString() << " with error " << error_text.ToString() << " ("
     << error_code << ").</h2></body></html>";

  frame->LoadURL(ToDataUri(ss.str(), "text/html"));
}

void LauncherHandler::ShowMainWindow() {
  if (!CefCurrentlyOn(TID_UI)) {
    CefPostTask(TID_UI, base::BindOnce(&LauncherHandler::ShowMainWindow, this));
    return;
  }

  if (browser_list_.empty()) {
    return;
  }

  auto browser = browser_list_.front();
  if (auto browser_view = CefBrowserView::GetForBrowser(browser)) {
    if (auto window = browser_view->GetWindow()) {
      window->Show();
    }
  } else if (use_views_style_) {
    PlatformShowWindow(browser);
  }
}

void LauncherHandler::CloseAllBrowsers(bool force_close) {
  if (!CefCurrentlyOn(TID_UI)) {
    CefPostTask(TID_UI, base::BindOnce(&LauncherHandler::CloseAllBrowsers, this,
                                       force_close));
    return;
  }

  if (browser_list_.empty()) {
    return;
  }

  for (auto& browser : browser_list_) {
    browser->GetHost()->CloseBrowser(force_close);
  }
}

#if !defined(__APPLE__)
void LauncherHandler::PlatformShowWindow(CefRefPtr<CefBrowser> browser) {
  NOTIMPLEMENTED();
}
#endif
