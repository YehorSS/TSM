use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

/// Открывает сайт Trenitalia в отдельном окне со списком поездов на нужный маршрут и время
/// (как это работает — в trenitalia.js). params — JSON { origin, destination, date, time, local }.
// async: в Windows окно, созданное из синхронной команды, зависает с пустым WebView
#[tauri::command]
async fn open_trenitalia(app: tauri::AppHandle, params: String) -> Result<(), String> {
    // разбираем и собираем JSON заново: в скрипт попадают только данные, а не произвольный код
    let params: serde_json::Value = serde_json::from_str(&params).map_err(|e| e.to_string())?;
    let script = include_str!("trenitalia.js").replace("__TSM_PARAMS__", &params.to_string());

    if let Some(old) = app.get_webview_window("trenitalia") {
        let _ = old.destroy();
    }
    let url = tauri::Url::parse("https://www.lefrecce.it/Channels.Website.WEB/").map_err(|e| e.to_string())?;
    WebviewWindowBuilder::new(&app, "trenitalia", WebviewUrl::External(url))
        .title("Покупка билета — Trenitalia")
        .inner_size(1200.0, 860.0)
        .center()
        .initialization_script(&script)
        .build()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![open_trenitalia])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
