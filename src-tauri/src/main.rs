// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::net::TcpStream;
use std::path::Path;
use std::sync::Mutex;
use std::time::Duration;

use tauri::{Manager, RunEvent};
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

const BACKEND_PORT: u16 = 3001;

/// Guarda o processo filho do backend WhatsApp para poder encerrá-lo
/// explicitamente quando o app for fechado.
struct BackendProcess(Mutex<Option<CommandChild>>);

/// Verifica rapidamente se algo já está escutando na porta do backend
/// (evita spawns duplicados caso o usuário abra duas instâncias do app
/// ou o backend já esteja rodando de uma sessão anterior).
fn backend_is_running() -> bool {
    TcpStream::connect_timeout(
        &format!("127.0.0.1:{BACKEND_PORT}").parse().unwrap(),
        Duration::from_millis(300),
    )
    .is_ok()
}

/// No Windows, associa o PID do processo filho a um Job Object com a flag
/// KILL_ON_JOB_CLOSE. Isso garante que o backend Node seja encerrado mesmo
/// se o app Tauri travar ou for finalizado à força (o Windows mata o
/// processo filho quando o handle do Job é fechado).
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

    // Mantém o Job vivo pelo resto da execução do app: se ele for
    // dropado, o Windows mataria o processo associado imediatamente.
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

#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/c", "start", "", &url])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Envia um arquivo PDF para a impressora padrão do Windows via PowerShell.
/// Usa Start-Process com -Verb Print, que aciona o leitor PDF padrão em modo impressão.
#[tauri::command]
fn print_pdf_file(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("powershell")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                &format!("Start-Process -FilePath '{}' -Verb Print", path.replace('\'', "''")),
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

fn main() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_printer_v2::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .manage(BackendProcess(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![write_bytes_to_file, open_folder, open_external_url, print_pdf_file])
        .setup(|app| {
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
                .spawn()
                .expect("falha ao iniciar o backend WhatsApp (sidecar)");

            attach_to_kill_on_close_job(child.pid());

            app.state::<BackendProcess>().0.lock().unwrap().replace(child);

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
