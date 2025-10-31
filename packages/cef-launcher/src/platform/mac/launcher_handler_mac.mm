#include "launcher_handler.h"

#import <Cocoa/Cocoa.h>

#include <cmath>

#include "cef_application_mac.h"
#include "cef_browser.h"

namespace {

NSWindow* GetWindowForBrowser(CefRefPtr<CefBrowser> browser) {
  NSView* view = CAST_CEF_WINDOW_HANDLE_TO_NSVIEW(
      browser->GetHost()->GetWindowHandle());
  return [view window];
}

NSString* const kWindowStateKey = @"CodeAIHubStandaloneWindowState";

constexpr CGFloat kMinWindowWidth = 960.0;
constexpr CGFloat kMinWindowHeight = 640.0;
constexpr CGFloat kMaxWindowWidth = 4096.0;
constexpr CGFloat kMaxWindowHeight = 2304.0;

static CGFloat Clamp(CGFloat value, CGFloat minimum, CGFloat maximum) {
  if (std::isnan(value) || std::isinf(value)) {
    return minimum;
  }
  if (minimum > maximum) {
    return minimum;
  }
  if (value < minimum) {
    return minimum;
  }
  if (value > maximum) {
    return maximum;
  }
  return value;
}

static NSRect ComputeSafeFrame(NSRect frame) {
  NSScreen* screen = [NSScreen mainScreen];
  if (!screen) {
    return frame;
  }

  const NSRect available = [screen visibleFrame];

  const CGFloat width = Clamp(frame.size.width, kMinWindowWidth,
                              std::min(kMaxWindowWidth, available.size.width));
  const CGFloat height = Clamp(
      frame.size.height, kMinWindowHeight,
      std::min(kMaxWindowHeight, available.size.height));

  const CGFloat maxX = available.origin.x + available.size.width - width;
  const CGFloat maxY = available.origin.y + available.size.height - height;

  const CGFloat x = Clamp(frame.origin.x, available.origin.x, maxX);
  const CGFloat y = Clamp(frame.origin.y, available.origin.y, maxY);

  return NSMakeRect(x, y, width, height);
}

static void RestoreWindowState(NSWindow* window) {
  if (!window) {
    return;
  }

  NSUserDefaults* defaults = [NSUserDefaults standardUserDefaults];
  NSDictionary* storedFrame = [defaults dictionaryForKey:kWindowStateKey];
  if (!storedFrame) {
    return;
  }

  NSNumber* xValue = storedFrame[@"x"];
  NSNumber* yValue = storedFrame[@"y"];
  NSNumber* widthValue = storedFrame[@"width"];
  NSNumber* heightValue = storedFrame[@"height"];

  if (!xValue || !yValue || !widthValue || !heightValue) {
    return;
  }

  NSRect target = NSMakeRect([xValue doubleValue], [yValue doubleValue],
                             [widthValue doubleValue],
                             [heightValue doubleValue]);
  target = ComputeSafeFrame(target);

  // macOS coordinates increase upwards; adjust using screen frame.
  NSScreen* screen = [window screen] ?: [NSScreen mainScreen];
  if (screen) {
    const NSRect screenFrame = [screen frame];
    target.origin.y = screenFrame.origin.y + screenFrame.size.height -
                      target.origin.y - target.size.height;
  }

  [window setFrame:target display:YES animate:NO];
}

static void PersistWindowState(NSWindow* window) {
  if (!window) {
    return;
  }

  NSRect frame = [window frame];
  NSScreen* screen = [window screen] ?: [NSScreen mainScreen];
  if (screen) {
    const NSRect screenFrame = [screen frame];
    frame.origin.y = screenFrame.origin.y + screenFrame.size.height -
                     frame.origin.y - frame.size.height;
  }

  frame = ComputeSafeFrame(frame);

  NSDictionary* payload = @{ @"x" : @(frame.origin.x),
                              @"y" : @(frame.origin.y),
                              @"width" : @(frame.size.width),
                              @"height" : @(frame.size.height) };

  NSUserDefaults* defaults = [NSUserDefaults standardUserDefaults];
  [defaults setObject:payload forKey:kWindowStateKey];
  [defaults synchronize];
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
    RestoreWindowState(window);
    [window makeKeyAndOrderFront:window];
  }
}

void LauncherHandler::PlatformPersistWindowState(
    CefRefPtr<CefBrowser> browser) {
  NSWindow* window = GetWindowForBrowser(browser);
  if (!window) {
    return;
  }
  PersistWindowState(window);
}
