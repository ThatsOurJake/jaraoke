#[cfg_attr(mobile, tauri::mobile_entry_point)]
use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use tauri::Manager;
use tauri::WebviewUrl;

// State to hold the child process
struct NodeProcess(Mutex<Option<Child>>);

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle();

            // Determine resource directory based on build mode
            let resource_dir = if cfg!(debug_assertions) {
                // In debug mode, resources are in target/debug/resources
                std::env::current_exe()
                    .ok()
                    .and_then(|p| p.parent().map(|p| p.to_path_buf()))
                    .map(|p| p.join("resources"))
                    .ok_or("Failed to get debug resource path")?
            } else {
                // In release mode, use Tauri's resource_dir API
                handle
                    .path()
                    .resource_dir()
                    .map_err(|e| format!("Failed to get resource_dir: {}", e))?
            };

            let node_path = if cfg!(target_os = "windows") {
                resource_dir.join("bin/node.exe")
            } else {
                resource_dir.join("bin/node")
            };

            let with_browser = std::env::args().any(|a| a == "--with-browser");

            // Spawn the Node.js server process
            let mut child = Command::new(&node_path)
                .current_dir(&resource_dir)
                .env("NODE_ENV", "production")
                .env("WITH_BROWSER", if with_browser { "true" } else { "false" })
                .env("FORCE_COLOR", "0")
                .stdin(Stdio::null())
                .arg("app/index.js")
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .spawn()
                .map_err(|e| format!("Failed to spawn Node.js process: {}", e))?;

            // Capture and forward stdout to terminal
            if let Some(stdout) = child.stdout.take() {
                thread::spawn(move || {
                    let reader = BufReader::new(stdout);
                    for line in reader.lines().flatten() {
                        println!("[Node] {}", line);
                    }
                });
            }

            // Capture and forward stderr to terminal
            if let Some(stderr) = child.stderr.take() {
                thread::spawn(move || {
                    let reader = BufReader::new(stderr);
                    for line in reader.lines().flatten() {
                        eprintln!("[Node] {}", line);
                    }
                });
            }

            // Store the child process in app state
            app.manage(NodeProcess(Mutex::new(Some(child))));

            // Create webview window if --with-browser flag is present
            if with_browser {
                // Wait for the Node.js server to start
                thread::sleep(Duration::from_secs(2));

                tauri::WebviewWindow::builder(
                    app,
                    "main",
                    WebviewUrl::External("http://127.0.0.1:9897".parse().unwrap()),
                )
                .title("Jaraoke")
                .inner_size(1200.0, 640.0)
                .visible(true)
                .build()
                .map_err(|e| format!("Failed to build window: {}", e))?;
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
        .on_before_exit(|app_handle| {
            // Kill the Node.js process when the app is closing
            if let Some(node_process) = app_handle.try_state::<NodeProcess>() {
                if let Ok(mut child_opt) = node_process.0.lock() {
                    if let Some(mut child) = child_opt.take() {
                        let _ = child.kill();
                        let _ = child.wait();
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
