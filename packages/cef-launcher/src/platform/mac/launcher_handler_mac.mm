#include "launcher_handler.h"

#import <Cocoa/Cocoa.h>

#import "window_state_persistence.h"
#import "window_state_tracker.h"

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
  if (!window) {
    return;
  }

  std::string utf8_title = title.ToString();
  NSString* ns_title = [NSString stringWithUTF8String:utf8_title.c_str()];
  [window setTitle:ns_title];
}

void LauncherHandler::PlatformShowWindow(CefRefPtr<CefBrowser> browser) {
  NSWindow* window = GetWindowForBrowser(browser);
  if (!window) {
    return;
  }

  [WindowStatePersistence restoreWindow:window];
  [window makeKeyAndOrderFront:window];
  [WindowStateTracker startTrackingWindow:window];
}

void LauncherHandler::PlatformPersistWindowState(
    CefRefPtr<CefBrowser> browser) {
  NSWindow* window = GetWindowForBrowser(browser);
  if (!window) {
    return;
  }

  [WindowStateTracker stopTrackingWindow:window];
  [WindowStatePersistence persistWindow:window];
}
