#include "launcher_handler.h"

#import <Cocoa/Cocoa.h>

#include "cef_application_mac.h"
#include "cef_browser.h"

namespace {

NSWindow* GetWindowForBrowser(CefRefPtr<CefBrowser> browser) {
  NSView* view = CAST_CEF_WINDOW_HANDLE_TO_NSVIEW(
      browser->GetHost()->GetWindowHandle());
  return [view window];
}

}  // namespace

void LauncherHandler::PlatformTitleChange(CefRefPtr<CefBrowser> browser,
                                          const CefString& title) {
  NSWindow* window = GetWindowForBrowser(browser);
  if (!window)
    return;
  std::string utf8_title = title.ToString();
  NSString* ns_title = [NSString stringWithUTF8String:utf8_title.c_str()];
  [window setTitle:ns_title];
}

void LauncherHandler::PlatformShowWindow(CefRefPtr<CefBrowser> browser) {
  NSWindow* window = GetWindowForBrowser(browser);
  if (window) {
    [window makeKeyAndOrderFront:window];
  }
}
