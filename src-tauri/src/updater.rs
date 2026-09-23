use std::path::PathBuf;
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct AppInstallInfo {
    pub is_portable: bool,
    pub exe_path: String,
}

#[derive(serde::Serialize, Clone, Debug)]
pub struct DownloadProgressPayload {
    pub percentage: u8,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
}

pub fn get_install_info() -> Result<AppInstallInfo, String> {
    let current_exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let path_str = current_exe.to_string_lossy().to_string();
    let lower = path_str.to_lowercase();

    let is_installed = lower.contains("appdata\\local\\programs")
        || lower.contains("program files")
        || lower.contains("program files (x86)");

    let is_portable = !is_installed || lower.contains("portable");

    Ok(AppInstallInfo {
        is_portable,
        exe_path: path_str,
    })
}

pub fn cleanup_old_updates() {
    if let Ok(current_exe) = std::env::current_exe() {
        let old_file = current_exe.with_extension("exe.old");
        if old_file.exists() {
            let _ = std::fs::remove_file(old_file);
        }
        let old_alt = current_exe.with_extension("old");
        if old_alt.exists() {
            let _ = std::fs::remove_file(old_alt);
        }
    }
}

pub async fn download_and_apply_update(
    app: AppHandle,
    download_url: String,
    total_bytes: u64,
    is_portable: bool,
) -> Result<(), String> {
    let current_exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let current_exe_str = current_exe.to_string_lossy().to_string();
    let temp_dir = std::env::temp_dir();

    let temp_file: PathBuf = if is_portable {
        temp_dir.join("Taskmaster-Everywhere-Update.exe")
    } else {
        temp_dir.join("Taskmaster-Everywhere-Setup-Update.exe")
    };

    if temp_file.exists() {
        let _ = std::fs::remove_file(&temp_file);
    }

    let temp_path_str = temp_file.to_string_lossy().to_string();

    // 1. Spawn curl.exe to download with follow-redirects
    let mut child = Command::new("curl.exe")
        .args(["-L", "-f", "-s", "-o", &temp_path_str, &download_url])
        .spawn()
        .map_err(|e| format!("Failed to execute curl.exe: {}", e))?;

    // 2. Poll file size for live download progress
    let is_done = Arc::new(AtomicBool::new(false));
    let is_done_clone = is_done.clone();
    let app_clone = app.clone();
    let temp_path_clone = temp_file.clone();

    tokio::spawn(async move {
        while !is_done_clone.load(Ordering::Relaxed) {
            tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;
            let downloaded = std::fs::metadata(&temp_path_clone)
                .map(|m| m.len())
                .unwrap_or(0);
            let pct = if total_bytes > 0 {
                ((downloaded as f64 / total_bytes as f64) * 100.0).min(99.0) as u8
            } else {
                50
            };
            let _ = app_clone.emit(
                "update-download-progress",
                DownloadProgressPayload {
                    percentage: pct,
                    downloaded_bytes: downloaded,
                    total_bytes,
                },
            );
        }
    });

    let status = child
        .wait()
        .map_err(|e| format!("Download process error: {}", e))?;
    is_done.store(true, Ordering::Relaxed);

    if !status.success() {
        return Err(format!(
            "Download failed with exit code: {:?}",
            status.code()
        ));
    }

    // Emit 100% completion
    let _ = app.emit(
        "update-download-progress",
        DownloadProgressPayload {
            percentage: 100,
            downloaded_bytes: total_bytes,
            total_bytes,
        },
    );

    // Give a brief moment for filesystem flush
    tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;

    // 3. Create detached update runner script
    let bat_path = temp_dir.join("taskmaster_apply_update.bat");

    if is_portable {
        // Portable in-place replacement: rename current -> .old, place new -> current, launch new
        let script = format!(
            "@echo off\r\n\
            timeout /t 1 /nobreak >nul\r\n\
            :wait_process\r\n\
            del \"{0}.old\" 2>nul\r\n\
            move /y \"{0}\" \"{0}.old\" >nul 2>&1\r\n\
            if exist \"{0}\" (\r\n\
                timeout /t 1 /nobreak >nul\r\n\
                goto wait_process\r\n\
            )\r\n\
            move /y \"{1}\" \"{0}\" >nul 2>&1\r\n\
            start \"\" \"{0}\"\r\n\
            timeout /t 2 /nobreak >nul\r\n\
            del \"{0}.old\" 2>nul\r\n\
            del \"%~f0\" 2>nul\r\n",
            current_exe_str, temp_path_str
        );
        std::fs::write(&bat_path, script).map_err(|e| e.to_string())?;
    } else {
        // Installed in-place upgrade: run setup installer silently (/S) then relaunch app
        let script = format!(
            "@echo off\r\n\
            timeout /t 1 /nobreak >nul\r\n\
            start /wait \"\" \"{0}\" /S\r\n\
            timeout /t 1 /nobreak >nul\r\n\
            start \"\" \"{1}\"\r\n\
            del \"{0}\" 2>nul\r\n\
            del \"%~f0\" 2>nul\r\n",
            temp_path_str, current_exe_str
        );
        std::fs::write(&bat_path, script).map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let _ = Command::new("cmd.exe")
            .args(["/c", bat_path.to_str().unwrap_or("taskmaster_apply_update.bat")])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn();
    }

    // Exit old process cleanly so batch script can replace files
    app.exit(0);
    Ok(())
}
