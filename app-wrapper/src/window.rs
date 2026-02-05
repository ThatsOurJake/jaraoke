use std::path::PathBuf;
use tauri::{WebviewUrl, WebviewWindow};

pub fn create_splash_window(app: &tauri::App, resource_dir: &PathBuf) -> Result<(), String> {
    let splash_path = resource_dir.join("splash.html");

    // Verify splash.html exists
    if !splash_path.exists() {
        return Err(format!(
            "splash.html not found at: {}",
            splash_path.display()
        ));
    }

    let splash_url = format!("file://{}", splash_path.display());

    tauri::WebviewWindow::builder(
        app,
        "splash",
        WebviewUrl::External(splash_url.parse().unwrap()),
    )
    .title("Loading Jaraoke...")
    .inner_size(500.0, 400.0)
    .center()
    .decorations(false)
    .resizable(false)
    .visible(true)
    .build()
    .map_err(|e| format!("Failed to build splash window: {}", e))?;

    Ok(())
}

pub fn create_main_window(
    app_handle: &tauri::AppHandle,
) -> Result<WebviewWindow, Box<dyn std::error::Error>> {
    let window = tauri::WebviewWindow::builder(
        app_handle,
        "main",
        WebviewUrl::External("http://127.0.0.1:9897".parse()?),
    )
    .title("Jaraoke")
    .inner_size(1200.0, 640.0)
    .visible(true)
    .build()?;

    Ok(window)
}
