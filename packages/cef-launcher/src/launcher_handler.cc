#include "launcher_handler.h"

#include <algorithm>
#include <climits>
#include <cstdlib>
#include <sstream>
#include <string>

#include "base/cef_callback.h"
#include "cef_app.h"
#include "include/cef_drag_data.h"
#include "include/views/cef_browser_view.h"
#include "include/views/cef_window.h"
#include "core_launcher.h"
#include "launcher_handler_bridge_helpers.h"
#include "wrapper/cef_closure_task.h"
#include "wrapper/cef_helpers.h"

#if defined(__APPLE__)
bool PickFolderFromFinder(std::string* out_path);
#endif

namespace {

LauncherHandler* g_handler_instance = nullptr;

std::string DecodeQueryValue(const std::string& url, const std::string& key) {
  CefURLParts parts;
  if (!CefParseURL(url, parts)) {
    return "";
  }

  const std::string query = CefString(&parts.query);
  const std::string prefix = key + "=";
  std::stringstream query_stream(query);
  std::string segment;
  while (std::getline(query_stream, segment, '&')) {
    if (segment.compare(0, prefix.size(), prefix) != 0) {
      continue;
    }
    const std::string encoded = segment.substr(prefix.size());
    return CefURIDecode(encoded, false, UU_NORMAL).ToString();
  }

  return "";
}

int DecodePositiveInteger(const std::string& url, const std::string& key) {
  const std::string value = DecodeQueryValue(url, key);
  if (value.empty()) {
    return 0;
  }

  char* end = nullptr;
  const long parsed = std::strtol(value.c_str(), &end, 10);
  if (
      end == value.c_str() || !end || *end != '\0' || parsed <= 0 ||
      parsed > INT_MAX) {
    return 0;
  }

  return static_cast<int>(parsed);
}

std::string NormalizePathSeparators(const std::string& path) {
  std::string normalized = path;
  std::replace(normalized.begin(), normalized.end(), '\\', '/');
  return normalized;
}

std::string QuoteForPosixShell(const std::string& value) {
  std::string quoted = "'";
  for (const char ch : value) {
    if (ch == '\'') {
      quoted += "'\\''";
      continue;
    }
    quoted.push_back(ch);
  }
  quoted.push_back('\'');
  return quoted;
}

std::string BuildVsCodeUri(const std::string& path, int line, int column) {
  const std::string encoded_path =
      CefURIEncode(NormalizePathSeparators(path), false).ToString();
  std::string uri = "vscode://file/" + encoded_path;
  if (line > 0) {
    uri += ":" + std::to_string(line);
    if (column > 0) {
      uri += ":" + std::to_string(column);
    }
  }
  return uri;
}

}  // namespace

namespace launcher_bridge = launcher_handler_bridge_helpers;

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

bool LauncherHandler::OnDragEnter(CefRefPtr<CefBrowser> browser,
                                 CefRefPtr<CefDragData> dragData,
                                 DragOperationsMask mask) {
  CEF_REQUIRE_UI_THREAD();
  static_cast<void>(browser);
  static_cast<void>(mask);

  last_drag_file_paths_.clear();

  if (!dragData) {
    return false;
  }

  std::vector<CefString> file_paths;
  dragData->GetFilePaths(file_paths);
  if (file_paths.empty()) {
    // Fallback: may only provide display names in some OS contexts.
    std::vector<CefString> file_names;
    dragData->GetFileNames(file_names);
    file_paths = file_names;
  }

  if (file_paths.empty()) {
    return false;
  }

  last_drag_file_paths_.reserve(file_paths.size());
  for (const auto& entry : file_paths) {
    const std::string candidate = entry.ToString();
    if (!candidate.empty()) {
      last_drag_file_paths_.push_back(candidate);
    }
  }

  return false;
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

  frame->LoadURL(launcher_bridge::ToDataUri(
                     launcher_bridge::BuildLoadErrorHtml(
                         failed_url.ToString(), error_text.ToString(),
                         error_code),
                     "text/html"));
}

void LauncherHandler::OnLoadEnd(CefRefPtr<CefBrowser> browser,
                                CefRefPtr<CefFrame> frame,
                                int httpStatusCode) {
  CEF_REQUIRE_UI_THREAD();
  static_cast<void>(browser);
  static_cast<void>(httpStatusCode);

  if (frame && frame->IsMain()) {
    launcher_bridge::InjectLauncherBridge(frame);
  }
}

bool LauncherHandler::OnBeforeBrowse(CefRefPtr<CefBrowser> browser,
                                     CefRefPtr<CefFrame> frame,
                                     CefRefPtr<CefRequest> request,
                                     bool user_gesture,
                                     bool is_redirect) {
  CEF_REQUIRE_UI_THREAD();
  static_cast<void>(user_gesture);
  static_cast<void>(is_redirect);

  if (!frame || !frame->IsMain() || !request) {
    return false;
  }
  const std::string url = request->GetURL();

  if (launcher_bridge::IsCoreStartRequest(url)) {
    CefPostTask(
      TID_FILE_BACKGROUND,
      base::BindOnce([]() {
        static_cast<void>(codeai::launcher::EnsureCoreProcessRunning());
      }));
    return true;
  }

  if (launcher_bridge::IsFileDropRequest(url)) {
    launcher_bridge::SendDroppedFiles(browser, last_drag_file_paths_);
    last_drag_file_paths_.clear();
    return true;
  }

  if (launcher_bridge::IsOpenInVsCodeRequest(url)) {
    static_cast<void>(OpenInVsCodeRequest(url));
    return true;
  }

  if (!launcher_bridge::IsPickFolderRequest(url)) {
    return false;
  }

#if defined(__APPLE__)
  std::string selected_path;
  if (PickFolderFromFinder(&selected_path) && !selected_path.empty()) {
    launcher_bridge::SendFolderPicked(browser, selected_path);
  }
  return true;
#else
  // Unsupported on non-macOS. Cancel navigation to avoid breaking the SPA.
  return true;
#endif
}

bool LauncherHandler::OpenInVsCodeRequest(const std::string& url) {
  const std::string path = DecodeQueryValue(url, "path");
  if (path.empty()) {
    return false;
  }

  const std::string vscode_uri = BuildVsCodeUri(
      path, DecodePositiveInteger(url, "line"),
      DecodePositiveInteger(url, "column"));

#if defined(__APPLE__)
  const std::string command = "open " + QuoteForPosixShell(vscode_uri);
  return std::system(command.c_str()) == 0;
#elif defined(__linux__)
  const std::string command =
      "xdg-open " + QuoteForPosixShell(vscode_uri) + " >/dev/null 2>&1 &";
  return std::system(command.c_str()) == 0;
#elif defined(_WIN32)
  static_cast<void>(vscode_uri);
  return false;
#else
  static_cast<void>(vscode_uri);
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
