#ifndef CODEAI_HUB_LAUNCHER_HANDLER_H_
#define CODEAI_HUB_LAUNCHER_HANDLER_H_

#include <list>
#include <string>
#include <vector>

#include "cef_client.h"
#include "include/cef_drag_handler.h"

namespace codeai::launcher {

// Requests orderly application termination through the OS-native path.
// On macOS this routes through -[NSApplication terminate:], which unwinds
// via -[NSApplication stop:] and bypasses the Chromium 141 async
// browser-teardown callback that crashes on macOS 26.x. See
// doc/SolidWorks-WorkFlow/Plans/Archive/CEF_MacOS_CanClose_ShortCircuit_Architecture.md
// and BUG-2026-04-22-01. Other platforms currently fall through to the
// default CEF teardown path; see the #else branch in
// LauncherWindowDelegate::CanClose.
void RequestNativeApplicationTermination();

// macOS-only close-frame mitigation for disposable CEF popup windows.
// Other platforms never call this helper.
void PrepareNativePopupWindowForClose(CefWindowHandle window_handle);

}  // namespace codeai::launcher

class LauncherHandler : public CefClient,
                         public CefDisplayHandler,
                         public CefDragHandler,
                         public CefLifeSpanHandler,
                         public CefLoadHandler,
                         public CefRequestHandler {
 public:
  explicit LauncherHandler(bool use_views_style);
  ~LauncherHandler() override;

  static LauncherHandler* GetInstance();

  // CefClient methods.
  CefRefPtr<CefDisplayHandler> GetDisplayHandler() override { return this; }
  CefRefPtr<CefDragHandler> GetDragHandler() override { return this; }
  CefRefPtr<CefLifeSpanHandler> GetLifeSpanHandler() override { return this; }
  CefRefPtr<CefLoadHandler> GetLoadHandler() override { return this; }
  CefRefPtr<CefRequestHandler> GetRequestHandler() override { return this; }

  // CefDisplayHandler methods.
  void OnTitleChange(CefRefPtr<CefBrowser> browser,
                     const CefString& title) override;

  // CefDragHandler methods.
  bool OnDragEnter(CefRefPtr<CefBrowser> browser,
                   CefRefPtr<CefDragData> dragData,
                   DragOperationsMask mask) override;

  // CefLifeSpanHandler methods.
  void OnAfterCreated(CefRefPtr<CefBrowser> browser) override;
  bool DoClose(CefRefPtr<CefBrowser> browser) override;
  void OnBeforeClose(CefRefPtr<CefBrowser> browser) override;

  // CefLoadHandler methods.
  void OnLoadError(CefRefPtr<CefBrowser> browser,
                   CefRefPtr<CefFrame> frame,
                   ErrorCode errorCode,
                   const CefString& errorText,
                   const CefString& failedUrl) override;
  void OnLoadEnd(CefRefPtr<CefBrowser> browser,
                 CefRefPtr<CefFrame> frame,
                 int httpStatusCode) override;

  // CefRequestHandler methods.
  bool OnBeforeBrowse(CefRefPtr<CefBrowser> browser,
                      CefRefPtr<CefFrame> frame,
                      CefRefPtr<CefRequest> request,
                      bool user_gesture,
                      bool is_redirect) override;

  void ShowMainWindow();
  void CloseAllBrowsers(bool force_close);
  bool IsClosing() const { return is_closing_; }

 private:
  bool OpenInVsCodeRequest(const std::string& url);
  void PlatformTitleChange(CefRefPtr<CefBrowser> browser,
                           const CefString& title);
  void PlatformShowWindow(CefRefPtr<CefBrowser> browser);
  void PlatformPersistWindowState(CefRefPtr<CefBrowser> browser);

  const bool use_views_style_;

  using BrowserList = std::list<CefRefPtr<CefBrowser>>;
  BrowserList browser_list_;

  bool is_closing_ = false;
  std::vector<std::string> last_drag_file_paths_;

  IMPLEMENT_REFCOUNTING(LauncherHandler);
  DISALLOW_COPY_AND_ASSIGN(LauncherHandler);
};

#endif  // CODEAI_HUB_LAUNCHER_HANDLER_H_
