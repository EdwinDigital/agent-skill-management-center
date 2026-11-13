use std::{
    io::{BufRead, BufReader},
    process::{Child, Command, Stdio},
    sync::{mpsc, Mutex},
    time::Duration,
};

use tauri::{Manager, RunEvent, WebviewWindow, WindowEvent};
use uuid::Uuid;

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

impl SidecarProcess {
    fn stop(&self) {
        let mut child = self.0.lock().unwrap_or_else(|error| error.into_inner());
        if let Some(mut process) = child.take() {
            if !matches!(process.try_wait(), Ok(Some(_))) {
                if let Err(error) = process.kill() {
                    eprintln!("failed to stop Agent SMC sidecar: {error}");
                    return;
                }
            }
            let _ = process.wait();
        }
    }
}

impl Drop for SidecarProcess {
    fn drop(&mut self) {
        self.stop();
    }
}

pub fn run() {
    let app = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            set_app_zoom,
            get_desktop_api_endpoint
        ])
        .setup(|app| {
            if !ensure_not_running_from_dmg(app)? {
                return Ok(());
            }

            let (api_base_url, api_token, sidecar) = start_sidecar(app)?;
            if let Some(window) = app.get_webview_window("main") {
                apply_development_window_title(&window)?;
                inject_api_endpoint(&window, &api_base_url, &api_token)?;
            }
            app.manage(sidecar);
            app.manage(DesktopApiState(DesktopApiEndpoint {
                api_base_url,
                api_token,
            }));
            Ok(())
        })
        .on_window_event(|window, event| {
            if matches!(event, WindowEvent::CloseRequested { .. }) {
                stop_sidecar(window.app_handle());
                window.app_handle().exit(0);
            }
        })
        .build(tauri::generate_context!())
        .expect("error while running Agent SMC");
    app.run(|app_handle, event| {
        // Tauri 直接退出进程，不会保证执行托管状态的 Drop。
        if matches!(event, RunEvent::Exit) {
            stop_sidecar(app_handle);
        }
    });
}

fn stop_sidecar(app: &tauri::AppHandle) {
    if let Some(sidecar) = app.try_state::<SidecarProcess>() {
        sidecar.stop();
    }
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

fn start_sidecar(app: &tauri::App) -> Result<(String, String, SidecarProcess), Box<dyn std::error::Error>> {
    let sidecar_dir = resolve_sidecar_dir(app)?;
    let node_path = bundled_node_path(&sidecar_dir);
    let app_data_dir = app.path().app_data_dir()?;
    std::fs::create_dir_all(&app_data_dir)?;

    let api_token = create_sidecar_token();
    let database_path = app_data_dir.join("analysis.sqlite");
    let mut command = Command::new(&node_path);
    command
        .arg("server.js")
        .current_dir(&sidecar_dir)
        .env("HOST", "127.0.0.1")
        .env("PORT", "0")
        .env("AGENT_SMC_SIDECAR", "1")
        .env("AGENT_SMC_PARENT_PIPE", "1")
        .env("AGENT_SMC_TOKEN", &api_token)
        .env("SKILL_ANALYSIS_DB", database_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit());

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;

        // 主程序的 windows_subsystem 不会传给子进程，需单独禁止 Node 创建控制台。
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    let mut child = command.spawn()?;

    let stdout = child.stdout.take();
    let sidecar = SidecarProcess(Mutex::new(Some(child)));
    let stdout = stdout.ok_or("sidecar stdout was not captured")?;
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
    let port = ready["port"]
        .as_u64()
        .ok_or("sidecar did not report a port")?;
    Ok((format!("http://{host}:{port}"), api_token, sidecar))
}

fn resolve_sidecar_dir(app: &tauri::App) -> Result<std::path::PathBuf, Box<dyn std::error::Error>> {
    let candidates = [
        app.path().resource_dir()?.join("sidecar-node"),
        std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("sidecar-node"),
    ];
    candidates
        .into_iter()
        .find(|path| path.join("server.js").exists() && bundled_node_path(path).exists())
        .ok_or_else(|| "Agent SMC sidecar runtime was not found".into())
}

fn bundled_node_path(sidecar_dir: &std::path::Path) -> std::path::PathBuf {
    #[cfg(target_os = "windows")]
    {
        sidecar_dir.join("runtime").join("node.exe")
    }
    #[cfg(not(target_os = "windows"))]
    {
        sidecar_dir.join("runtime").join("node")
    }
}

fn inject_api_endpoint(
    window: &WebviewWindow,
    api_base_url: &str,
    api_token: &str,
) -> tauri::Result<()> {
    let script = format!(
        "window.__AGENT_SMC_API_BASE_URL__ = {}; window.__AGENT_SMC_API_TOKEN__ = {};",
        serde_json::to_string(api_base_url).unwrap_or_default(),
        serde_json::to_string(api_token).unwrap_or_default()
    );
    window.eval(script)
}

fn create_sidecar_token() -> String {
    format!("agent-smc-{}", Uuid::new_v4().simple())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{io::Read, process::ChildStdout};

    fn spawn_fixture() -> (SidecarProcess, ChildStdout) {
        let mut child = Command::new(std::env::current_exe().unwrap())
            .args(["--exact", "tests::sidecar_child_fixture", "--ignored"])
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .unwrap();
        let stdout = child.stdout.take().unwrap();
        (SidecarProcess(Mutex::new(Some(child))), stdout)
    }

    fn assert_child_stopped(mut stdout: ChildStdout) {
        let (sender, receiver) = mpsc::channel();
        std::thread::spawn(move || {
            let _ = stdout.read_to_end(&mut Vec::new());
            let _ = sender.send(());
        });
        receiver.recv_timeout(Duration::from_secs(5)).expect("sidecar child still running");
    }

    #[test]
    #[ignore]
    fn sidecar_child_fixture() {
        loop {
            std::thread::sleep(Duration::from_secs(60));
        }
    }

    #[test]
    fn stop_reaps_the_child_and_is_idempotent() {
        let (sidecar, stdout) = spawn_fixture();
        sidecar.stop();
        assert!(sidecar.0.lock().unwrap().is_none());
        sidecar.stop();
        assert_child_stopped(stdout);
    }

    #[test]
    fn stop_recovers_a_poisoned_state_lock() {
        let (sidecar, stdout) = spawn_fixture();
        let _ = std::panic::catch_unwind(|| {
            let _guard = sidecar.0.lock().unwrap();
            panic!("poison the state lock");
        });
        sidecar.stop();
        assert!(sidecar.0.lock().unwrap_err().into_inner().is_none());
        assert_child_stopped(stdout);
    }

    #[test]
    fn dropped_startup_guard_stops_the_child() {
        let (sidecar, stdout) = spawn_fixture();
        drop(sidecar);
        assert_child_stopped(stdout);
    }
}
