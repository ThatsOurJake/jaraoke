use serde::Deserialize;
use std::thread;
use std::time::{Duration, Instant};
use tauri::Manager;

const MIN_SPLASH_DURATION_SECONDS: u64 = 2;
const MAX_HEALTH_CHECK_ATTEMPTS: u32 = 60;
const HEALTH_CHECK_INTERVAL_MS: u64 = 500;
const HEALTH_CHECK_URL: &str = "http://127.0.0.1:9897/api/health";

#[derive(Deserialize)]
struct HealthResponse {
    ready: bool,
}

pub fn poll_health_and_show_window(app_handle: tauri::AppHandle) {
    thread::spawn(move || {
        let start_time = Instant::now();
        let min_splash_duration = Duration::from_secs(MIN_SPLASH_DURATION_SECONDS);

        let client = reqwest::blocking::Client::new();
        let health_url = HEALTH_CHECK_URL;
        let max_attempts = MAX_HEALTH_CHECK_ATTEMPTS; // 30 seconds max (60 * 500ms)
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
            thread::sleep(Duration::from_millis(HEALTH_CHECK_INTERVAL_MS));
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
