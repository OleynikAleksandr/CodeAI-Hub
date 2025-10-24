#ifndef CODEAI_HUB_LAUNCHER_HANDLER_H_
#define CODEAI_HUB_LAUNCHER_HANDLER_H_

#include <list>

#include "cef_client.h"

class LauncherHandler : public CefClient,
                         public CefDisplayHandler,
                         public CefLifeSpanHandler,
                         public CefLoadHandler {
 public:
  explicit LauncherHandler(bool use_views_style);
  ~LauncherHandler() override;

  static LauncherHandler* GetInstance();

  // CefClient methods.
  CefRefPtr<CefDisplayHandler> GetDisplayHandler() override { return this; }
  CefRefPtr<CefLifeSpanHandler> GetLifeSpanHandler() override { return this; }
  CefRefPtr<CefLoadHandler> GetLoadHandler() override { return this; }

  // CefDisplayHandler methods.
  void OnTitleChange(CefRefPtr<CefBrowser> browser,
                     const CefString& title) override;

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

  void ShowMainWindow();
  void CloseAllBrowsers(bool force_close);
  bool IsClosing() const { return is_closing_; }

 private:
  void PlatformTitleChange(CefRefPtr<CefBrowser> browser,
                           const CefString& title);
  void PlatformShowWindow(CefRefPtr<CefBrowser> browser);

  const bool use_views_style_;

  using BrowserList = std::list<CefRefPtr<CefBrowser>>;
  BrowserList browser_list_;

  bool is_closing_ = false;

  IMPLEMENT_REFCOUNTING(LauncherHandler);
  DISALLOW_COPY_AND_ASSIGN(LauncherHandler);
};

#endif  // CODEAI_HUB_LAUNCHER_HANDLER_H_
