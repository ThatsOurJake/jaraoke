#[cfg_attr(mobile, tauri::mobile_entry_point)]
use std::sync::Mutex;
use tauri::Manager;

mod health_check;
mod node_process;
mod window;

use node_process::NodeProcess;

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Resolve and validate resources directory
            let base_resource_dir = app
                .path()
                .resource_dir()
                .map_err(|e| format!("Failed to get resource directory: {}", e))?;
            
            let resources_dir = base_resource_dir.join("resources");
            
            if !resources_dir.exists() {
                panic!(
                    "Resources directory not found at: {}. This is a critical error - the application cannot run without resources.",
                    resources_dir.display()
                );
            }

            // Check if running in server-only mode
            let server_only = std::env::args().any(|a| a == "--server");

            // Spawn the Node.js server process
            let child = node_process::spawn_node_server(&resources_dir, server_only)?;

            // Store the child process in app state
            app.manage(NodeProcess(Mutex::new(Some(child))));

            // Create webview window if not in server-only mode
            if !server_only {
                let app_handle = app.handle().clone();

                // Show splash screen
                window::create_splash_window(app, &resources_dir)?;

                // Poll health endpoint and show main window when ready
                health_check::poll_health_and_show_window(app_handle);
            }

            // Enable logging in debug builds
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                // Kill the Node.js process when the app is exiting
                if let Some(node_process) = app_handle.try_state::<NodeProcess>() {
                    if let Ok(mut child_opt) = node_process.0.lock() {
                        if let Some(mut child) = child_opt.take() {
                            let _ = child.kill();
                            let _ = child.wait();
                        }
                    }
                }
            }
        });
}
