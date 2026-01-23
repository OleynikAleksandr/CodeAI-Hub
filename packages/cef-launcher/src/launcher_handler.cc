#include "launcher_handler.h"

#include <sstream>
#include <string>

#include "base/cef_callback.h"
#include "cef_app.h"
#include "cef_parser.h"
#include "include/cef_values.h"
#include "include/views/cef_browser_view.h"
#include "include/views/cef_window.h"
#include "core_launcher.h"
#include "wrapper/cef_closure_task.h"
#include "wrapper/cef_helpers.h"

#if defined(__APPLE__)
bool PickFolderFromFinder(std::string* out_path);
#endif

namespace {

LauncherHandler* g_handler_instance = nullptr;
constexpr char kLauncherScheme[] = "codeai";
constexpr char kLauncherPickFolderHost[] = "pick-folder";

std::string ToDataUri(const std::string& data, const std::string& mime_type) {
  return "data:" + mime_type + ";base64," +
         CefURIEncode(CefBase64Encode(data.data(), data.size()), false)
             .ToString();
}

bool IsPickFolderRequest(const std::string& url) {
  CefURLParts parts;
  if (!CefParseURL(url, parts)) {
    return false;
  }
  const std::string scheme = CefString(&parts.scheme);
  if (scheme != kLauncherScheme) {
    return false;
  }
  const std::string host = CefString(&parts.host);
  if (host == kLauncherPickFolderHost) {
    return true;
  }
  const std::string path = CefString(&parts.path);
  return path == std::string("/") + kLauncherPickFolderHost;
}

void InjectLauncherBridge(CefRefPtr<CefFrame> frame) {
  if (!frame) {
    return;
  }
  const std::string script = R"JS(
(() => {
  if (typeof window.codeaiLauncher !== "object" || !window.codeaiLauncher) {
    window.codeaiLauncher = {};
  }
  if (typeof window.codeaiLauncher.pickFolder === "function") {
    return;
  }
  window.codeaiLauncher.pickFolder = () => {
    window.location.href = "codeai://pick-folder";
    return true;
  };
})()
)JS";
  frame->ExecuteJavaScript(script, frame->GetURL(), 0);
}

void SendFolderPicked(CefRefPtr<CefBrowser> browser, const std::string& path) {
  if (!browser) {
    return;
  }
  CefRefPtr<CefFrame> frame = browser->GetMainFrame();
  if (!frame) {
    return;
  }
  CefRefPtr<CefDictionaryValue> payload = CefDictionaryValue::Create();
  payload->SetString("path", path);
  CefRefPtr<CefDictionaryValue> message = CefDictionaryValue::Create();
  message->SetString("type", "projects:folderPicked");
  message->SetDictionary("payload", payload);
  CefRefPtr<CefValue> message_value = CefValue::Create();
  message_value->SetDictionary(message);
  CefString json = CefWriteJSON(message_value, JSON_WRITER_DEFAULT);
  std::string script = "window.postMessage(" + json.ToString() + ", '*');";
  frame->ExecuteJavaScript(script, frame->GetURL(), 0);
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
  PlatformShowWindow(browser);
}

bool LauncherHandler::DoClose(CefRefPtr<CefBrowser> browser) {
  CEF_REQUIRE_UI_THREAD();
  if (browser_list_.size() == 1) {
    PlatformPersistWindowState(browser);
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
        "<h2>Unable to load CodeAI Hub UI</h2>"
        "<p>Failed to load URL <code>"
     << failed_url.ToString()
     << "</code> with error "
     << error_text.ToString() << " (" << error_code
     << ").</p>"
        "<p>The core process is managed by the Core Supervisor. "
        "Please check the core runtime status at "
        "<code>/api/v1/status</code> or consult the launcher logs under "
        "<code>~/.codeai-hub/logs/launcher/launcher.log</code>.</p>"
        "</body></html>";

  frame->LoadURL(ToDataUri(ss.str(), "text/html"));
}

void LauncherHandler::OnLoadEnd(CefRefPtr<CefBrowser> browser,
                                CefRefPtr<CefFrame> frame,
                                int httpStatusCode) {
  CEF_REQUIRE_UI_THREAD();
  static_cast<void>(browser);
  static_cast<void>(httpStatusCode);

#if defined(__APPLE__)
  if (frame && frame->IsMain()) {
    InjectLauncherBridge(frame);
  }
#endif
}

bool LauncherHandler::OnBeforeBrowse(CefRefPtr<CefBrowser> browser,
                                     CefRefPtr<CefFrame> frame,
                                     CefRefPtr<CefRequest> request,
                                     bool user_gesture,
                                     bool is_redirect) {
  CEF_REQUIRE_UI_THREAD();
  static_cast<void>(user_gesture);
  static_cast<void>(is_redirect);

#if defined(__APPLE__)
  if (!frame || !frame->IsMain() || !request) {
    return false;
  }
  const std::string url = request->GetURL();
  if (!IsPickFolderRequest(url)) {
    return false;
  }
  std::string selected_path;
  if (PickFolderFromFinder(&selected_path) && !selected_path.empty()) {
    SendFolderPicked(browser, selected_path);
  }
  return true;
#else
  return false;
#endif
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

void LauncherHandler::PlatformPersistWindowState(
    CefRefPtr<CefBrowser> browser) {
  // No-op on non-macOS platforms for now.
}
#endif
