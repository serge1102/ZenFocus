use tauri::{LogicalSize, Window};

#[tauri::command]
async fn toggle_mini_mode(window: Window, is_mini: bool) {
    if is_mini {
        // ミニモード: 小さくして最前面に
        let _ = window.set_size(LogicalSize::new(340.0, 380.0));
        let _ = window.set_always_on_top(true);
        let _ = window.set_resizable(false);
    } else {
        // 通常モード: 元のサイズに戻す
        let _ = window.set_size(LogicalSize::new(800.0, 600.0));
        let _ = window.set_always_on_top(false);
        let _ = window.set_resizable(true);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![toggle_mini_mode])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
