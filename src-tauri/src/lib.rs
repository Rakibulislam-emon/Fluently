use tauri::{
    AppHandle, Emitter, Manager,
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

use enigo::{Enigo, KeyboardControllable, Key};
use std::{thread, time::Duration};

/// Read text from the system clipboard
#[tauri::command]
fn read_clipboard(app: AppHandle) -> Result<String, String> {
    app.clipboard()
        .read_text()
        .map_err(|e| format!("Clipboard read failed: {}", e))
}

/// Write text to clipboard (called before paste-back)
#[tauri::command]
fn write_clipboard(app: AppHandle, text: String) -> Result<(), String> {
    app.clipboard()
        .write_text(text)
        .map_err(|e| format!("Clipboard write failed: {}", e))
}

#[tauri::command]
fn trigger_copy_and_read(app: AppHandle) -> Result<(String, String), String> {
    // 1. Backup current clipboard
    let backup = app.clipboard().read_text().unwrap_or_default();
    
    // 2. Clear clipboard
    let _ = app.clipboard().write_text("".to_string());
    
    // 3. Simulate Ctrl+C (or Cmd+C on Mac)
    let mut enigo = Enigo::new();
    #[cfg(target_os = "macos")]
    {
        enigo.key_down(Key::Meta);
        enigo.key_click(Key::Layout('c'));
        enigo.key_up(Key::Meta);
    }
    #[cfg(not(target_os = "macos"))]
    {
        enigo.key_down(Key::Control);
        enigo.key_click(Key::Layout('c'));
        enigo.key_up(Key::Control);
    }

    // 4. Retry loop to wait for clipboard to populate
    let mut new_text = String::new();
    for _ in 0..20 { // up to 200ms
        thread::sleep(Duration::from_millis(10));
        if let Ok(text) = app.clipboard().read_text() {
            if !text.is_empty() {
                new_text = text;
                break;
            }
        }
    }

    Ok((new_text, backup))
}

#[tauri::command]
fn trigger_paste_and_restore(app: AppHandle, text: String, backup: String) -> Result<(), String> {
    // 1. Write the new text to clipboard
    let _ = app.clipboard().write_text(text);
    
    // 2. Simulate Ctrl+V (or Cmd+V)
    let mut enigo = Enigo::new();
    #[cfg(target_os = "macos")]
    {
        enigo.key_down(Key::Meta);
        enigo.key_click(Key::Layout('v'));
        enigo.key_up(Key::Meta);
    }
    #[cfg(not(target_os = "macos"))]
    {
        enigo.key_down(Key::Control);
        enigo.key_click(Key::Layout('v'));
        enigo.key_up(Key::Control);
    }

    // 3. Wait a tiny bit for the OS to process the paste before restoring clipboard
    thread::sleep(Duration::from_millis(100));
    
    // 4. Restore original clipboard
    let _ = app.clipboard().write_text(backup);
    
    Ok(())
}

/// Hide the popup window
#[tauri::command]
fn hide_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.hide().map_err(|e| format!("Hide failed: {}", e))?;
    }
    Ok(())
}

/// Show the popup window centered on screen
#[tauri::command]
fn show_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.center().map_err(|e| format!("Center failed: {}", e))?;
        window.show().map_err(|e| format!("Show failed: {}", e))?;
        window.set_focus().map_err(|e| format!("Focus failed: {}", e))?;
        
        #[cfg(debug_assertions)]
        {
            window.close_devtools();
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            read_clipboard,
            write_clipboard,
            hide_window,
            show_window,
            trigger_copy_and_read,
            trigger_paste_and_restore,
        ])
        .setup(|app| {
            // --- System Tray ---
            let quit = MenuItem::with_id(app, "quit", "Quit Fluently", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Fluently — English Communication Improvement")
                .menu(&menu)
                .on_menu_event(move |_app, event| {
                    let id = event.id.as_ref();
                    if id == "quit" {
                        std::process::exit(0);
                    }
                })
                .build(app)?;

            // --- Global Shortcuts ---
            // 1. Panel Shortcut (Ctrl+Shift+Space)
            let shortcut_panel = Shortcut::new(
                Some(Modifiers::CONTROL | Modifiers::SHIFT),
                Code::Space,
            );

            // 2. Invisible Execution Shortcut (Ctrl+M)
            let shortcut_invisible = Shortcut::new(
                Some(Modifiers::CONTROL),
                Code::KeyM,
            );

            let app_handle = app.handle().clone();
            app.global_shortcut().on_shortcut(shortcut_panel, {
                let app_handle = app_handle.clone();
                move |_app, _shortcut, _event| {
                    let _ = app_handle.emit("open-settings-panel", ());
                }
            })?;

            app.global_shortcut().on_shortcut(shortcut_invisible, move |_app, _shortcut, _event| {
                let _ = app_handle.emit("trigger-invisible-replace", ());
            })?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Fluently");
}
