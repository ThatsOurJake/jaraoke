use serde::Deserialize;
use std::thread;
use std::time::{Duration, Instant};
use tauri::Manager;

#[derive(Deserialize)]
struct HealthResponse {
    ready: bool,
}

pub fn poll_health_and_show_window(app_handle: tauri::AppHandle) {
    thread::spawn(move || {
        let start_time = Instant::now();
        let min_splash_duration = Duration::from_secs(2);

        let client = reqwest::blocking::Client::new();
        let health_url = "http://127.0.0.1:9897/api/health";
        let max_attempts = 60; // 30 seconds max (60 * 500ms)
        let mut attempts = 0;
        let mut server_ready = false;

        // Poll health endpoint
        while attempts < max_attempts {
            if let Ok(response) = client.get(health_url).send() {
                if let Ok(health) = response.json::<HealthResponse>() {
                    if health.ready {
                        server_ready = true;
                        break;
                    }
                }
            }

            attempts += 1;
            thread::sleep(Duration::from_millis(500));
        }

        if !server_ready {
            eprintln!(
                "[Tauri] Failed to connect to server after {} attempts",
                max_attempts
            );
            // Close splash on timeout
            let _ = app_handle.get_webview_window("splash").map(|w| w.close());
            return;
        }

        // Ensure minimum splash duration has elapsed
        let elapsed = start_time.elapsed();
        if elapsed < min_splash_duration {
            let remaining = min_splash_duration - elapsed;
            thread::sleep(remaining);
        }

        // Server is ready and minimum time has elapsed, create main window
        if let Ok(main_window) = crate::window::create_main_window(&app_handle) {
            // Close splash screen
            let _ = app_handle.get_webview_window("splash").map(|w| w.close());

            // Focus the main window
            let _ = main_window.set_focus();
        }
    });
}
