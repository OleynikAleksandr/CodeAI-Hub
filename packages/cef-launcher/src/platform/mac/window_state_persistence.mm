#import "window_state_persistence.h"

#import <Cocoa/Cocoa.h>

#import <algorithm>
#import <cmath>

namespace {

NSString* const kWindowStateKey = @"CodeAIHubStandaloneWindowState";
NSString* const kWindowAutosaveName = @"CodeAIHubMainWindow";

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

static void EnsureAutosaveConfigured(NSWindow* window) {
  if (!window) {
    return;
  }
  NSString* autosaveName = [window frameAutosaveName];
  if (![autosaveName isEqualToString:kWindowAutosaveName]) {
    [window setFrameAutosaveName:kWindowAutosaveName];
  }
}

static void SaveFrameUsingAutosave(NSWindow* window) {
  if (!window) {
    return;
  }
  EnsureAutosaveConfigured(window);
  [window saveFrameUsingName:kWindowAutosaveName];
}

static NSRect ComputeSafeFrame(NSRect frame, NSScreen* screen) {
  const NSScreen* targetScreen = screen ?: [NSScreen mainScreen];
  if (!targetScreen) {
    return frame;
  }

  const NSRect available = [targetScreen visibleFrame];

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

static NSRect NormalizeFrameToCocoa(NSRect frame, NSScreen* screen) {
  const NSScreen* targetScreen = screen ?: [NSScreen mainScreen];
  if (!targetScreen) {
    return frame;
  }

  const NSRect screenFrame = [targetScreen frame];
  frame.origin.y = screenFrame.origin.y + screenFrame.size.height -
                   frame.origin.y - frame.size.height;
  return frame;
}

static NSRect DenormalizeFrameFromCocoa(NSRect frame, NSScreen* screen) {
  const NSScreen* targetScreen = screen ?: [NSScreen mainScreen];
  if (!targetScreen) {
    return frame;
  }

  const NSRect screenFrame = [targetScreen frame];
  frame.origin.y = screenFrame.origin.y + screenFrame.size.height -
                   frame.origin.y - frame.size.height;
  return frame;
}

static bool RestoreUsingAutosave(NSWindow* window) {
  if (!window) {
    return false;
  }
  EnsureAutosaveConfigured(window);
  if ([window respondsToSelector:@selector(setFrameUsingName:)]) {
    return [window setFrameUsingName:kWindowAutosaveName];
  }
  return false;
}

}  // namespace

@implementation WindowStatePersistence

+ (void)restoreWindow:(NSWindow*)window {
  if (!window) {
    return;
  }

  if (RestoreUsingAutosave(window)) {
    return;
  }

  NSUserDefaults* defaults = [NSUserDefaults standardUserDefaults];
  NSDictionary* storedFrame = [defaults dictionaryForKey:kWindowStateKey];
  if (![storedFrame isKindOfClass:[NSDictionary class]]) {
    return;
  }

  NSNumber* xValue = storedFrame[@"x"];
  NSNumber* yValue = storedFrame[@"y"];
  NSNumber* widthValue = storedFrame[@"width"];
  NSNumber* heightValue = storedFrame[@"height"];

  if (!xValue || !yValue || !widthValue || !heightValue) {
    return;
  }

  NSRect desired = NSMakeRect([xValue doubleValue], [yValue doubleValue],
                              [widthValue doubleValue],
                              [heightValue doubleValue]);

  NSScreen* windowScreen = [window screen] ?: [NSScreen mainScreen];
  desired = ComputeSafeFrame(desired, windowScreen);
  desired = DenormalizeFrameFromCocoa(desired, windowScreen);

  [window setFrame:desired display:YES animate:NO];
  SaveFrameUsingAutosave(window);
}

+ (void)persistWindow:(NSWindow*)window {
  if (!window) {
    return;
  }

  NSScreen* windowScreen = [window screen] ?: [NSScreen mainScreen];
  NSRect frame = [window frame];

  SaveFrameUsingAutosave(window);

  frame = NormalizeFrameToCocoa(frame, windowScreen);
  frame = ComputeSafeFrame(frame, windowScreen);

  NSDictionary* payload = @{
    @"x" : @(frame.origin.x),
    @"y" : @(frame.origin.y),
    @"width" : @(frame.size.width),
    @"height" : @(frame.size.height)
  };

  NSUserDefaults* defaults = [NSUserDefaults standardUserDefaults];
  [defaults setObject:payload forKey:kWindowStateKey];
  [defaults synchronize];
}

@end
