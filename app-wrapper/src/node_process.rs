use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread;

pub struct NodeProcess(pub Mutex<Option<Child>>);

pub fn get_resource_dir() -> Result<PathBuf, String> {
    let resource_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .map(|p| p.join("resources"))
        .ok_or("Failed to get resource path")?;

    // Verify resources directory exists
    if !resource_dir.exists() {
        return Err(format!(
            "Resources directory not found at: {}",
            resource_dir.display()
        ));
    }

    Ok(resource_dir)
}

pub fn spawn_node_server(resource_dir: &PathBuf, server_only: bool) -> Result<Child, String> {
    let node_path = if cfg!(target_os = "windows") {
        resource_dir.join("bin/node.exe")
    } else {
        resource_dir.join("bin/node")
    };

    let mut child = Command::new(&node_path)
        .current_dir(resource_dir)
        .env("NODE_ENV", "production")
        .env("SERVER_ONLY", if server_only { "true" } else { "false" })
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
