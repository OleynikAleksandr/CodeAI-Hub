#include "launcher_handler.h"

#import <Cocoa/Cocoa.h>
#import <QuartzCore/QuartzCore.h>

#include <string>

#import "window_state_persistence.h"
#import "window_state_tracker.h"

#include "cef_application_mac.h"
#include "cef_browser.h"

namespace {

NSColor* ProjectManagerBackgroundColor() {
  return [NSColor colorWithCalibratedRed:11.0 / 255.0
                                   green:13.0 / 255.0
                                    blue:18.0 / 255.0
                                   alpha:1.0];
}

NSWindow* GetWindowForBrowser(CefRefPtr<CefBrowser> browser) {
  NSView* view = CAST_CEF_WINDOW_HANDLE_TO_NSVIEW(
      browser->GetHost()->GetWindowHandle());
  return [view window];
}

NSWindow* GetWindowForHandle(CefWindowHandle window_handle) {
  NSView* view = CAST_CEF_WINDOW_HANDLE_TO_NSVIEW(window_handle);
  return [view window];
}

void PaintNativeWindowDark(NSWindow* window) {
  if (!window) {
    return;
  }

  NSColor* background = ProjectManagerBackgroundColor();
  [window setOpaque:YES];
  [window setBackgroundColor:background];

  NSView* content_view = [window contentView];
  if (content_view) {
    [content_view setWantsLayer:YES];
    [[content_view layer] setBackgroundColor:[background CGColor]];
    [content_view setNeedsDisplay:YES];
  }
  [window displayIfNeeded];
}

}  // namespace

bool PickFolderFromFinder(std::string* out_path) {
  if (!out_path) {
    return false;
  }

  NSOpenPanel* panel = [NSOpenPanel openPanel];
  [panel setCanChooseFiles:NO];
  [panel setCanChooseDirectories:YES];
  [panel setAllowsMultipleSelection:NO];
  [panel setCanCreateDirectories:YES];
  [panel setPrompt:@"Select"];

  const NSInteger result = [panel runModal];
  if (result != NSModalResponseOK) {
    return false;
  }

  NSURL* url = [panel URL];
  if (!url) {
    return false;
  }

  const char* path = [[url path] fileSystemRepresentation];
  if (!path) {
    return false;
  }

  *out_path = std::string(path);
  return true;
}

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

  if (!browser || !browser->IsPopup()) {
    [WindowStatePersistence restoreWindow:window];
    [WindowStateTracker startTrackingWindow:window];
  }
  [window makeKeyAndOrderFront:window];
}

void LauncherHandler::PlatformPersistWindowState(
    CefRefPtr<CefBrowser> browser) {
  if (!browser || browser->IsPopup()) {
    return;
  }

  NSWindow* window = GetWindowForBrowser(browser);
  if (!window) {
    return;
  }

  [WindowStateTracker stopTrackingWindow:window];
  [WindowStatePersistence persistWindow:window];
}

namespace codeai::launcher {

void PrepareNativePopupWindowForClose(CefWindowHandle window_handle) {
  NSWindow* window = GetWindowForHandle(window_handle);
  if (!window) {
    return;
  }

  PaintNativeWindowDark(window);
  [window setAnimationBehavior:NSWindowAnimationBehaviorNone];
  [window orderOut:nil];
}

void RequestNativeApplicationTermination() {
  // Forwarding the red window-close button into -[NSApplication terminate:]
  // is the canonical fix for BUG-2026-04-22-01 on macOS 26.x: AppKit then
  // unwinds via -stop: and -terminate: in the same way Cmd+Q / Dock Quit
  // do, bypassing the Chromium 141 async browser-teardown callback that
  // throws NSInvalidArgumentException ("unrecognized selector sent to
  // instance" / NSApplication) on that OS. Three earlier mitigations
  // (1.2.50 NSSetUncaughtExceptionHandler, 1.2.51 reportException: swizzle)
  // tried to absorb the exception after the fact and did not suffice.
  [NSApp terminate:nil];
}

}  // namespace codeai::launcher
