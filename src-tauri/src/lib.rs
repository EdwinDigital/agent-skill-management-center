use std::{
    io::{BufRead, BufReader},
    process::{Child, Command, Stdio},
    sync::{mpsc, Mutex},
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use tauri::{Manager, WebviewWindow, WindowEvent};

const APP_WINDOW_TITLE: &str = "Agent Skills Management Center-SMC";
const DEV_WINDOW_TITLE: &str = "Agent Skills Management Center-SMC 「DEV」";

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopApiEndpoint {
    api_base_url: String,
    api_token: String,
}

struct SidecarProcess(Mutex<Option<Child>>);

struct DesktopApiState(DesktopApiEndpoint);

impl Drop for SidecarProcess {
    fn drop(&mut self) {
        if let Ok(mut child) = self.0.lock() {
            if let Some(mut process) = child.take() {
                let _ = process.kill();
                let _ = process.wait();
            }
        }
    }
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![set_app_zoom, get_desktop_api_endpoint])
        .setup(|app| {
            if !ensure_not_running_from_dmg(app)? {
                return Ok(());
            }

            let (api_base_url, api_token, child) = start_sidecar(app)?;
            app.manage(SidecarProcess(Mutex::new(Some(child))));
            app.manage(DesktopApiState(DesktopApiEndpoint {
                api_base_url: api_base_url.clone(),
                api_token: api_token.clone(),
            }));
            if let Some(window) = app.get_webview_window("main") {
                apply_development_window_title(&window)?;
                inject_api_endpoint(&window, &api_base_url, &api_token)?;
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if matches!(event, WindowEvent::CloseRequested { .. }) {
                window.app_handle().exit(0);
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Agent SMC");
}

#[tauri::command]
fn set_app_zoom(window: WebviewWindow, scale_factor: f64) -> tauri::Result<()> {
    let scale_factor = scale_factor.clamp(0.8, 1.4);
    window.set_zoom(scale_factor)
}

#[tauri::command]
fn get_desktop_api_endpoint(state: tauri::State<'_, DesktopApiState>) -> DesktopApiEndpoint {
    state.0.clone()
}

fn apply_development_window_title(window: &WebviewWindow) -> tauri::Result<()> {
    if cfg!(debug_assertions) {
        window.set_title(DEV_WINDOW_TITLE)?;
    } else {
        window.set_title(APP_WINDOW_TITLE)?;
    }
    Ok(())
}

fn ensure_not_running_from_dmg(app: &tauri::App) -> Result<bool, Box<dyn std::error::Error>> {
    if is_running_from_mounted_volume() {
        show_dmg_installation_warning();
        app.handle().exit(0);
        return Ok(false);
    }

    Ok(true)
}

fn is_running_from_mounted_volume() -> bool {
    #[cfg(target_os = "macos")]
    {
        std::env::current_exe()
            .map(|path| path.starts_with("/Volumes/"))
            .unwrap_or(false)
    }

    #[cfg(not(target_os = "macos"))]
    {
        false
    }
}

fn show_dmg_installation_warning() {
    #[cfg(target_os = "macos")]
    {
        let _ = Command::new("osascript")
            .arg("-e")
            .arg("display dialog \"请先将 Agent SMC 拖到“应用程序”文件夹后再打开。不要直接从 DMG 安装窗口中运行应用，否则安装包可能无法推出。\" buttons {\"退出\"} default button \"退出\" with icon caution")
            .status();
    }
}

fn start_sidecar(app: &tauri::App) -> Result<(String, String, Child), Box<dyn std::error::Error>> {
    let sidecar_dir = resolve_sidecar_dir(app)?;
    let sidecar_path = sidecar_dir.join("agent-smc-sidecar");
    let app_data_dir = app.path().app_data_dir()?;
    std::fs::create_dir_all(&app_data_dir)?;

    let api_token = create_sidecar_token();
    let database_path = app_data_dir.join("analysis.sqlite");
    let mut child = Command::new(&sidecar_path)
        .current_dir(&sidecar_dir)
        .env("HOST", "127.0.0.1")
        .env("PORT", "0")
        .env("AGENT_SMC_SIDECAR", "1")
        .env("AGENT_SMC_TOKEN", &api_token)
        .env("SKILL_ANALYSIS_DB", database_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()?;

    let stdout = child.stdout.take().ok_or("sidecar stdout was not captured")?;
    let (ready_sender, ready_receiver) = mpsc::channel::<String>();
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        let mut sent_ready = false;
        for line in reader.lines().map_while(Result::ok) {
            if !sent_ready && line.starts_with("AGENT_SMC_READY ") {
                let _ = ready_sender.send(line.clone());
                sent_ready = true;
            }
            println!("{line}");
        }
    });

    let ready_line = ready_receiver.recv_timeout(Duration::from_secs(20))?;
    let ready_payload = ready_line.trim_start_matches("AGENT_SMC_READY ");
    let ready: serde_json::Value = serde_json::from_str(ready_payload)?;
    let host = ready["host"].as_str().unwrap_or("127.0.0.1");
    let port = ready["port"].as_u64().ok_or("sidecar did not report a port")?;
    Ok((format!("http://{host}:{port}"), api_token, child))
}

fn resolve_sidecar_dir(app: &tauri::App) -> Result<std::path::PathBuf, Box<dyn std::error::Error>> {
    let candidates = [
        app.path().resource_dir()?.join("sidecar-node"),
        std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("sidecar-node"),
    ];
    candidates
        .into_iter()
        .find(|path| path.join("agent-smc-sidecar").exists())
        .ok_or_else(|| "Agent SMC sidecar runtime was not found".into())
}

fn inject_api_endpoint(window: &WebviewWindow, api_base_url: &str, api_token: &str) -> tauri::Result<()> {
    let script = format!(
        "window.__AGENT_SMC_API_BASE_URL__ = {}; window.__AGENT_SMC_API_TOKEN__ = {};",
        serde_json::to_string(api_base_url).unwrap_or_default(),
        serde_json::to_string(api_token).unwrap_or_default()
    );
    window.eval(script)
}

fn create_sidecar_token() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or_default();
    format!("agent-smc-{nanos}-{}", std::process::id())
}