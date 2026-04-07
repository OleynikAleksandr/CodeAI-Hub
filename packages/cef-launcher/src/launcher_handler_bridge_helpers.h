#ifndef CODEAI_HUB_LAUNCHER_HANDLER_BRIDGE_HELPERS_H_
#define CODEAI_HUB_LAUNCHER_HANDLER_BRIDGE_HELPERS_H_

#include <sstream>
#include <string>
#include <vector>

#include "cef_parser.h"
#include "include/cef_browser.h"
#include "include/cef_frame.h"
#include "include/cef_values.h"

namespace launcher_handler_bridge_helpers {

inline constexpr char kLauncherScheme[] = "codeai";
inline constexpr char kLauncherPickFolderHost[] = "pick-folder";
inline constexpr char kLauncherFileDropHost[] = "file-drop";
inline constexpr char kLauncherCoreStartHost[] = "core-start";
inline constexpr char kLauncherOpenInVsCodeHost[] = "open-in-vscode";

inline std::string ToDataUri(const std::string& data,
                             const std::string& mime_type) {
  return "data:" + mime_type + ";base64," +
         CefURIEncode(CefBase64Encode(data.data(), data.size()), false)
             .ToString();
}

inline bool IsLauncherRequestWithHost(const std::string& url,
                                      const char* expected_host) {
  CefURLParts parts;
  if (!CefParseURL(url, parts)) {
    return false;
  }

  const std::string scheme = CefString(&parts.scheme);
  if (scheme != kLauncherScheme) {
    return false;
  }

  const std::string host = CefString(&parts.host);
  if (host == expected_host) {
    return true;
  }

  const std::string path = CefString(&parts.path);
  return path == std::string("/") + expected_host;
}

inline bool IsPickFolderRequest(const std::string& url) {
  return IsLauncherRequestWithHost(url, kLauncherPickFolderHost);
}

inline bool IsFileDropRequest(const std::string& url) {
  return IsLauncherRequestWithHost(url, kLauncherFileDropHost);
}

inline bool IsCoreStartRequest(const std::string& url) {
  return IsLauncherRequestWithHost(url, kLauncherCoreStartHost);
}

inline bool IsOpenInVsCodeRequest(const std::string& url) {
  return IsLauncherRequestWithHost(url, kLauncherOpenInVsCodeHost);
}

inline void InjectLauncherBridge(CefRefPtr<CefFrame> frame) {
  if (!frame) {
    return;
  }

  const std::string script = R"JS(
(() => {
  if (typeof window.codeaiLauncher !== "object" || !window.codeaiLauncher) {
    window.codeaiLauncher = {};
  }

  if (typeof window.codeaiLauncher.requestFileDrop !== "function") {
    window.codeaiLauncher.requestFileDrop = () => {
      window.location.href = "codeai://file-drop";
      return true;
    };
  }

  if (typeof window.codeaiLauncher.pickFolder !== "function") {
    window.codeaiLauncher.pickFolder = () => {
      window.location.href = "codeai://pick-folder";
      return true;
    };
  }

  if (typeof window.codeaiLauncher.ensureCoreRunning !== "function") {
    window.codeaiLauncher.ensureCoreRunning = () => {
      window.location.href = "codeai://core-start";
      return true;
    };
  }

  if (typeof window.codeaiLauncher.openInVsCodeFile !== "function") {
    window.codeaiLauncher.openInVsCodeFile = (payload) => {
      if (!payload || typeof payload.path !== "string" || payload.path.length === 0) {
        return false;
      }

      const params = [`path=${encodeURIComponent(payload.path)}`];
      if (Number.isInteger(payload.line) && payload.line > 0) {
        params.push(`line=${payload.line}`);
      }
      if (Number.isInteger(payload.column) && payload.column > 0) {
        params.push(`column=${payload.column}`);
      }

      window.location.href = `codeai://open-in-vscode?${params.join("&")}`;
      return true;
    };
  }
})()
)JS";
  frame->ExecuteJavaScript(script, frame->GetURL(), 0);
}

inline std::string BuildLoadErrorHtml(const std::string& failed_url,
                                      const std::string& error_text,
                                      int error_code) {
  std::stringstream ss;
  ss << "<html><body bgcolor=\"white\">"
        "<h2>Unable to load CodeAI Hub UI</h2>"
        "<p>Failed to load URL <code>"
     << failed_url << "</code> with error " << error_text << " (" << error_code
     << ").</p>"
        "<p>The core process is managed by the Core Supervisor. "
        "Please check the core runtime status at "
        "<code>/api/v1/status</code> or consult the launcher logs under "
        "<code>~/.codeai-hub/logs/launcher/launcher.log</code>.</p>"
        "</body></html>";
  return ss.str();
}

inline std::string FormatDroppedPathsForInsert(
    const std::vector<std::string>& paths) {
  if (paths.empty()) {
    return "";
  }

  std::ostringstream out;
  for (size_t i = 0; i < paths.size(); ++i) {
    out << "\"" << paths[i] << "\"";
    if (i + 1 < paths.size()) {
      out << "\n";
    }
  }
  out << "\n";
  return out.str();
}

inline void SendFolderPicked(CefRefPtr<CefBrowser> browser,
                             const std::string& path) {
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

inline void SendDroppedFiles(CefRefPtr<CefBrowser> browser,
                             const std::vector<std::string>& paths) {
  if (!browser || paths.empty()) {
    return;
  }

  CefRefPtr<CefFrame> frame = browser->GetMainFrame();
  if (!frame) {
    return;
  }

  CefRefPtr<CefDictionaryValue> message = CefDictionaryValue::Create();
  message->SetString("command", "insertPath");
  message->SetString("path", FormatDroppedPathsForInsert(paths));

  CefRefPtr<CefValue> message_value = CefValue::Create();
  message_value->SetDictionary(message);
  CefString json = CefWriteJSON(message_value, JSON_WRITER_DEFAULT);
  std::string script = "window.postMessage(" + json.ToString() + ", '*');";
  frame->ExecuteJavaScript(script, frame->GetURL(), 0);
}

}  // namespace launcher_handler_bridge_helpers

#endif  // CODEAI_HUB_LAUNCHER_HANDLER_BRIDGE_HELPERS_H_
