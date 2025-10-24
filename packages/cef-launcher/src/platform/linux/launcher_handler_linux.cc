#include "launcher_handler.h"

#include <gtk/gtk.h>

#include "cef_browser.h"

void LauncherHandler::PlatformTitleChange(CefRefPtr<CefBrowser> browser,
                                          const CefString& title) {
  GtkWidget* widget = browser->GetHost()->GetWindowHandle();
  if (widget) {
    gtk_window_set_title(GTK_WINDOW(widget), title.ToString().c_str());
  }
}

void LauncherHandler::PlatformShowWindow(CefRefPtr<CefBrowser> browser) {
  GtkWidget* widget = browser->GetHost()->GetWindowHandle();
  if (widget) {
    gtk_widget_show_all(widget);
  }
}
