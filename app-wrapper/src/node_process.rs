use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread;

pub struct NodeProcess(pub Mutex<Option<Child>>);

pub fn spawn_node_server(resources_dir: &PathBuf, server_only: bool) -> Result<Child, String> {
    // Resolve node binary path
    let node_binary = if cfg!(target_os = "windows") {
        "bin/node.exe"
    } else {
        "bin/node"
    };

    let node_path = resources_dir.join(node_binary);

    // Verify node binary exists
    if !node_path.exists() {
        panic!(
            "Node binary not found at: {}. This is a critical error.",
            node_path.display()
        );
    }

    // Resolve app entry point
    let app_entry = resources_dir.join("app/index.js");

    // Verify app entry point exists
    if !app_entry.exists() {
        panic!(
            "App entry point not found at: {}. This is a critical error.",
            app_entry.display()
        );
    }

    let mut child = Command::new(&node_path)
        .current_dir(resources_dir)
        .env("NODE_ENV", "production")
        .env("SERVER_ONLY", if server_only { "true" } else { "false" })
        .env("FORCE_COLOR", "0")
        .stdin(Stdio::null())
        .arg(&app_entry)
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
                use std::io::Write;
                let _ = std::io::stdout().flush();
            }
        });
    }

    // Capture and forward stderr to terminal
    if let Some(stderr) = child.stderr.take() {
        thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines().flatten() {
                eprintln!("[Node] {}", line);
                use std::io::Write;
                let _ = std::io::stderr().flush();
            }
        });
    }

    Ok(child)
}
