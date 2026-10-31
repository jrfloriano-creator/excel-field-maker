// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::net::TcpStream;
use std::path::Path;
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{Manager, RunEvent, State};
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

const BACKEND_PORT: u16 = 3001;

/// Guarda o processo filho do backend WhatsApp
struct BackendProcess(Mutex<Option<CommandChild>>);

/// ✅ CORREÇÃO CRÍTICA: Guarda o token de API para ser acessado pelo frontend
struct ApiToken(String);

/// Verifica se o backend já está rodando
fn backend_is_running() -> bool {
    TcpStream::connect_timeout(
        &format!("127.0.0.1:{BACKEND_PORT}").parse().unwrap(),
        Duration::from_millis(300),
    )
    .is_ok()
}

/// ✅ CORREÇÃO CRÍTICA: Gera um token único por execução
/// Combina timestamp + PID para garantir unicidade mesmo em restarts rápidos
fn generate_api_token() -> String {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let pid = std::process::id();
    format!("zoom_{}_{}", timestamp, pid)
}

#[cfg(target_os = "windows")]
fn attach_to_kill_on_close_job(pid: u32) {
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::System::Threading::{OpenProcess, PROCESS_SET_QUOTA, PROCESS_TERMINATE};

    let job = match win32job::Job::create() {
        Ok(job) => job,
        Err(e) => {
            eprintln!("[backend-sidecar] falha ao criar Job Object: {e}");
            return;
        }
    };

    let mut info = match job.query_extended_limit_info() {
        Ok(info) => info,
        Err(e) => {
            eprintln!("[backend-sidecar] falha ao consultar limites do Job: {e}");
            return;
        }
    };

    info.limit_kill_on_job_close();

    if let Err(e) = job.set_extended_limit_info(&info) {
        eprintln!("[backend-sidecar] falha ao aplicar limites do Job: {e}");
        return;
    }

    unsafe {
        match OpenProcess(PROCESS_SET_QUOTA | PROCESS_TERMINATE, false, pid) {
            Ok(handle) => {
                if let Err(e) = job.assign_process(handle.0 as isize) {
                    eprintln!("[backend-sidecar] falha ao associar processo ao Job: {e}");
                }
                let _ = CloseHandle(handle);
            }
            Err(e) => {
                eprintln!("[backend-sidecar] falha ao abrir handle do processo: {e}");
            }
        }
    }

    std::mem::forget(job);
}

#[cfg(not(target_os = "windows"))]
fn attach_to_kill_on_close_job(_pid: u32) {}

#[tauri::command]
fn write_bytes_to_file(path: String, data: Vec<u8>) -> Result<(), String> {
    let p = Path::new(&path);
    if let Some(parent) = p.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(p, &data).map_err(|e| e.to_string())
}

#[tauri::command]
fn open_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ============================================================
// CORREÇÃO CRÍTICA: open_external_url seguro (usa tauri_plugin_opener)
// ============================================================
#[tauri::command]
async fn open_external_url(url: String) -> Result<(), String> {
    let lower = url.to_lowercase();
    if !(lower.starts_with("http://")
        || lower.starts_with("https://")
        || lower.starts_with("mailto:")
        || lower.starts_with("whatsapp://"))
    {
        return Err(format!("Esquema de URL não permitido: {}", url));
    }

    tauri_plugin_opener::open_url(&url, None::<&str>)
        .map_err(|e| format!("Falha ao abrir URL: {}", e))?;

    Ok(())
}

// ✅ CORREÇÃO: Typo corrigido (era #[tauri::comma nd])
#[tauri::command]
fn print_pdf_file(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("powershell")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                &format!(
                    "Start-Process -FilePath '{}' -Verb Print",
                    path.replace('\'', "''")
                ),
            ])
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("lp")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("lp")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }
    #[allow(unreachable_code)]
    Err("Plataforma não suportada".to_string())
}

// ============================================================
// ✅ CORREÇÃO CRÍTICA: Comando Tauri para o frontend obter o token
// ============================================================
#[tauri::command]
fn get_api_token(token: State<'_, ApiToken>) -> String {
    token.0.clone()
}

fn main() {
    // ✅ CORREÇÃO CRÍTICA: Gera o token UMA VEZ no startup
    let api_token = generate_api_token();
    println!(
        "[main] 🔐 Token da API gerado (primeiros 8 chars): {}...",
        &api_token[..8.min(api_token.len())]
    );

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_printer_v2::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .manage(BackendProcess(Mutex::new(None)))
        .manage(ApiToken(api_token.clone())) // ✅ Token disponível via State
        .invoke_handler(tauri::generate_handler![
            write_bytes_to_file,
            open_folder,
            open_external_url,
            print_pdf_file,
            get_api_token // ✅ Novo comando exposto ao frontend
        ])
        .setup(move |app| {
            if backend_is_running() {
                println!("[backend-sidecar] backend já está rodando em 127.0.0.1:{BACKEND_PORT}, reutilizando instância existente");
                return Ok(());
            }

            let auth_dir = app
                .path()
                .app_data_dir()
                .expect("não foi possível resolver app_data_dir")
                .join("whatsapp")
                .join("auth_info");
            fs::create_dir_all(&auth_dir).ok();

            let backend_dir = app
                .path()
                .resource_dir()
                .expect("não foi possível resolver resource_dir")
                .join("backend");
            let entry_point = backend_dir.join("dist").join("index.js");

            // ✅ CORREÇÃO CRÍTICA: Passa o token ao sidecar via env var
            let (mut rx, child) = app
                .shell()
                .sidecar("backend-node")
                .expect("falha ao localizar o sidecar do backend")
                .args([entry_point.to_string_lossy().to_string()])
                .current_dir(backend_dir)
                .env("PORT", BACKEND_PORT.to_string())
                .env("NODE_ENV", "production")
                .env("WHATSAPP_SESSION_DIR", auth_dir.to_string_lossy().to_string())
                .env("AUTO_RECONNECT", "true")
                .env("WHATSAPP_API_TOKEN", api_token.clone()) // ✅ Token ao backend
                .spawn()
                .expect("falha ao iniciar o backend WhatsApp (sidecar)");

            attach_to_kill_on_close_job(child.pid());

            app.state::<BackendProcess>()
                .0
                .lock()
                .unwrap()
                .replace(child);

            tauri::async_runtime::spawn(async move {
                use tauri_plugin_shell::process::CommandEvent;
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(line) => {
                            print!("[backend] {}", String::from_utf8_lossy(&line));
                        }
                        CommandEvent::Stderr(line) => {
                            eprint!("[backend] {}", String::from_utf8_lossy(&line));
                        }
                        CommandEvent::Terminated(payload) => {
                            eprintln!("[backend-sidecar] processo encerrado: {payload:?}");
                        }
                        _ => {}
                    }
                }
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        if let RunEvent::ExitRequested { .. } = event {
            if let Some(child) = app_handle.state::<BackendProcess>().0.lock().unwrap().take() {
                let _ = child.kill();
            }
        }
    });
}