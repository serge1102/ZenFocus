use tauri::{LogicalSize, Window};

#[tauri::command]
async fn toggle_mini_mode(window: Window, is_mini: bool) {
    if let (Ok(current_pos), Ok(current_size), Ok(scale_factor)) = (
        window.outer_position(),
        window.outer_size(),
        window.scale_factor(),
    ) {
        let target_size = if is_mini {
            LogicalSize::new(340.0, 380.0).to_physical::<u32>(scale_factor)
        } else {
            LogicalSize::new(800.0, 600.0).to_physical::<u32>(scale_factor)
        };

        // Calculate new X position to keep the top-right corner fixed
        // New X = Old X + Old Width - New Width
        let new_x = current_pos.x + (current_size.width as i32) - (target_size.width as i32);
        let new_pos = tauri::PhysicalPosition::new(new_x, current_pos.y);

        if is_mini {
            let _ = window.set_size(tauri::Size::Physical(target_size));
            let _ = window.set_position(tauri::Position::Physical(new_pos));
            let _ = window.set_always_on_top(true);
            let _ = window.set_resizable(false);
        } else {
            let _ = window.set_resizable(true);
            let _ = window.set_size(tauri::Size::Physical(target_size));
            let _ = window.set_position(tauri::Position::Physical(new_pos));
            let _ = window.set_always_on_top(false);
        }
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
