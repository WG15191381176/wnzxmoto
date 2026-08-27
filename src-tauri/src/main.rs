#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_sql::{Migration, MigrationKind};
use tauri::Manager;
use std::fs;
use std::path::PathBuf;

// 把数据库编译进二进制（include_bytes! 在编译时读取文件）
const PRELOADED_DB: &[u8] = include_bytes!("../inventory.db");

// Windows 原生消息框（不依赖 WebView2）
#[cfg(all(windows, not(debug_assertions)))]
fn show_native_message(title: &str, message: &str) {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::UI::WindowsAndMessaging::{MessageBoxW, MB_OK, MB_ICONINFORMATION};

    let title_wide: Vec<u16> = OsStr::new(title).encode_wide().chain(Some(0)).collect();
    let msg_wide: Vec<u16> = OsStr::new(message).encode_wide().chain(Some(0)).collect();
    unsafe {
        MessageBoxW(
            std::ptr::null_mut(),
            msg_wide.as_ptr(),
            title_wide.as_ptr(),
            MB_OK | MB_ICONINFORMATION,
        );
    }
}

fn get_app_data_dir() -> PathBuf {
    // 使用标准 AppData 目录，不创建子文件夹，匹配 tauri_plugin_sql 的预期路径
    dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
}

fn ensure_preloaded_db(app_data_dir: &PathBuf) -> Result<(), String> {
    let dest_db = app_data_dir.join("inventory.db");
    
    if dest_db.exists() {
        return Ok(());
    }
    
    // 确保目录存在
    if let Some(parent) = dest_db.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {}", e))?;
    }
    
    // 释放内嵌数据库
    fs::write(&dest_db, PRELOADED_DB).map_err(|e| format!("写入数据库失败: {}", e))?;
    
    Ok(())
}

fn main() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: include_str!("../migrations/001_initial_tables.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_new_fields",
            sql: include_str!("../migrations/002_add_new_fields.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add_part_english_name_notes",
            sql: include_str!("../migrations/003_add_part_english_name_notes.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "add_suppliers_notes",
            sql: include_str!("../migrations/004_add_suppliers_notes.sql"),
            kind: MigrationKind::Up,
        },
    ];

    // 启动即释放内嵌数据库 + 显示原生弹窗确认
    #[cfg(all(windows, not(debug_assertions)))]
    {
        let app_data_dir = get_app_data_dir();
        let dest_db = app_data_dir.join("inventory.db");
        let db_existed_before = dest_db.exists();
        
        // 释放数据库
        let release_result = ensure_preloaded_db(&app_data_dir);
        let db_exists_after = dest_db.exists();
        let db_size = fs::metadata(&dest_db).map(|m| m.len()).unwrap_or(0);
        
        let msg = match release_result {
            Ok(_) => format!(
                "WNZXMOTO 启动诊断\n\n\
                AppData 目录: {}\n\
                数据库文件: {}\n\
                启动前存在: {}\n\
                启动后存在: {}\n\
                文件大小: {} bytes ({:.1} MB)\n\
                内嵌数据库大小: {} bytes\n\n\
                ✅ 数据库已就绪，点击确定启动主程序...",
                app_data_dir.display(),
                dest_db.display(),
                db_existed_before,
                db_exists_after,
                db_size,
                db_size as f64 / 1024.0 / 1024.0,
                PRELOADED_DB.len()
            ),
            Err(e) => format!(
                "WNZXMOTO 启动错误\n\n\
                AppData 目录: {}\n\
                错误: {}\n\n\
                ❌ 请联系开发者或手动复制 inventory.db 到上述目录",
                app_data_dir.display(),
                e
            ),
        };
        show_native_message("WNZXMOTO 启动诊断", &msg);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default()
            .add_migrations("sqlite:inventory.db", migrations)
            .build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            
            // 调试模式也释放数据库
            #[cfg(debug_assertions)]
            {
                let app_data_dir = app.path().app_data_dir().unwrap_or_default();
                if let Err(e) = ensure_preloaded_db(&app_data_dir) {
                    eprintln!("[INIT] Failed to release embedded database: {}", e);
                }
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}