pub mod models;
pub mod store;
pub mod updater;

use std::sync::Arc;
use tokio::sync::RwLock;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, State, WindowEvent,
};
use uuid::Uuid;
use chrono::{Days, Duration, Local, NaiveDate};

use models::{DailyHistoryRecord, OverlayState, OverlayTheme, TodoItem};
use store::{load_state, save_state};

#[cfg(target_os = "windows")]
mod windows_boundary {
    use std::sync::atomic::{AtomicIsize, Ordering};
    use windows::Win32::{
        Foundation::{HWND, LPARAM, LRESULT, POINT, RECT, WPARAM},
        Graphics::Gdi::{
            GetMonitorInfoW, MonitorFromPoint, MONITORINFO, MONITOR_DEFAULTTONEAREST,
        },
        UI::WindowsAndMessaging::{
            CallWindowProcW, DefWindowProcW, GetCursorPos, SetWindowLongPtrW, GWLP_WNDPROC,
            WNDPROC, WM_MOVING, WM_SIZING,
        },
    };

    static PREV_WNDPROC: AtomicIsize = AtomicIsize::new(0);

    pub unsafe extern "system" fn widget_wnd_proc(
        hwnd: HWND,
        msg: u32,
        wparam: WPARAM,
        lparam: LPARAM,
    ) -> LRESULT {
        if msg == WM_MOVING || msg == WM_SIZING {
            let rect_ptr = lparam.0 as *mut RECT;
            if !rect_ptr.is_null() {
                let rect = &mut *rect_ptr;

                let mut cursor_pt = POINT { x: 0, y: 0 };
                let _ = GetCursorPos(&mut cursor_pt);

                let h_monitor = MonitorFromPoint(cursor_pt, MONITOR_DEFAULTTONEAREST);
                let mut mi = MONITORINFO {
                    cbSize: std::mem::size_of::<MONITORINFO>() as u32,
                    ..std::mem::zeroed()
                };

                if GetMonitorInfoW(h_monitor, &mut mi).as_bool() {
                    let work = mi.rcWork;
                    let width = rect.right - rect.left;
                    let height = rect.bottom - rect.top;
                    let work_width = work.right - work.left;
                    let work_height = work.bottom - work.top;

                    if msg == WM_MOVING {
                        // Strict screen clamping: widget can NEVER be dragged outside screen/work area
                        if width <= work_width {
                            if rect.left < work.left {
                                rect.left = work.left;
                                rect.right = work.left + width;
                            } else if rect.right > work.right {
                                rect.right = work.right;
                                rect.left = work.right - width;
                            }
                        } else {
                            rect.left = work.left;
                            rect.right = work.right;
                        }

                        if height <= work_height {
                            if rect.top < work.top {
                                rect.top = work.top;
                                rect.bottom = work.top + height;
                            } else if rect.bottom > work.bottom {
                                rect.bottom = work.bottom;
                                rect.top = work.bottom - height;
                            }
                        } else {
                            rect.top = work.top;
                            rect.bottom = work.bottom;
                        }
                    } else if msg == WM_SIZING {
                        // Strict screen clamping when resizing
                        if rect.left < work.left {
                            rect.left = work.left;
                        }
                        if rect.right > work.right {
                            rect.right = work.right;
                        }
                        if rect.top < work.top {
                            rect.top = work.top;
                        }
                        if rect.bottom > work.bottom {
                            rect.bottom = work.bottom;
                        }
                    }
                }
            }
            return LRESULT(1);
        }

        let prev = PREV_WNDPROC.load(Ordering::Relaxed);
        if prev != 0 {
            let prev_proc: WNDPROC = std::mem::transmute(prev);
            CallWindowProcW(prev_proc, hwnd, msg, wparam, lparam)
        } else {
            DefWindowProcW(hwnd, msg, wparam, lparam)
        }
    }

    pub fn attach_boundary_subclass(hwnd: HWND) {
        unsafe {
            if PREV_WNDPROC.load(Ordering::Relaxed) == 0 {
                let prev = SetWindowLongPtrW(
                    hwnd,
                    GWLP_WNDPROC,
                    widget_wnd_proc as *const () as usize as isize,
                );
                if prev != 0 {
                    PREV_WNDPROC.store(prev, Ordering::Relaxed);
                }
            }
        }
    }
}

pub struct AppContext {
    pub state: Arc<RwLock<OverlayState>>,
    pub app: Arc<RwLock<Option<AppHandle>>>,
}

pub fn prune_history(state: &mut OverlayState) {
    let today = Local::now().date_naive();
    let retention_days = if state.history_retention_days == 0 { 7 } else { state.history_retention_days };
    let cutoff = today - Days::new(retention_days as u64);
    state.history.retain(|rec| {
        if let Ok(rec_date) = NaiveDate::parse_from_str(&rec.date, "%Y-%m-%d") {
            rec_date >= cutoff
        } else {
            true
        }
    });
}

pub fn perform_daily_rollover(state: &mut OverlayState) -> bool {
    let today = Local::now().format("%Y-%m-%d").to_string();
    if state.last_active_date.is_empty() {
        state.last_active_date = today;
        return false;
    }
    if state.last_active_date != today {
        // Strict check: if there were tasks, snapshot all tasks present at 12 am into history
        if !state.todos.is_empty() {
            let completed_count = state.todos.iter().filter(|t| t.completed).count();
            let total_count = state.todos.len();
            let formatted_date = match NaiveDate::parse_from_str(&state.last_active_date, "%Y-%m-%d") {
                Ok(d) => d.format("%A, %b %e, %Y").to_string(),
                Err(_) => state.last_active_date.clone(),
            };
            let record = DailyHistoryRecord {
                id: Uuid::new_v4().to_string(),
                date: state.last_active_date.clone(),
                formatted_date,
                title: state.title.clone(),
                todos: state.todos.clone(),
                completed_count,
                total_count,
                archived_at: Local::now().to_rfc3339(),
            };
            state.history.insert(0, record);
            state.todos.clear();
        }
        state.last_active_date = today;
        prune_history(state);
        return true;
    }
    false
}

#[tauri::command]
async fn get_state(ctx: State<'_, AppContext>) -> Result<OverlayState, String> {
    let current = ctx.state.read().await;
    Ok(current.clone())
}

#[tauri::command]
async fn set_state(new_state: OverlayState, ctx: State<'_, AppContext>) -> Result<OverlayState, String> {
    {
        let mut current = ctx.state.write().await;
        *current = new_state.clone();
        save_state(&current)?;
    }
    broadcast_update(&ctx, &new_state).await;
    Ok(new_state)
}

#[tauri::command]
async fn add_todo(text: String, ctx: State<'_, AppContext>) -> Result<OverlayState, String> {
    let text = text.trim().to_string();
    if text.is_empty() {
        return Err("Todo text cannot be empty".into());
    }

    let updated = {
        let mut current = ctx.state.write().await;
        let new_item = TodoItem {
            id: Uuid::new_v4().to_string(),
            text,
            completed: false,
            completed_at: None,
        };
        current.todos.push(new_item);
        save_state(&current)?;
        current.clone()
    };

    broadcast_update(&ctx, &updated).await;
    Ok(updated)
}

#[tauri::command]
async fn toggle_todo(id: String, ctx: State<'_, AppContext>) -> Result<OverlayState, String> {
    let updated = {
        let mut current = ctx.state.write().await;
        if let Some(pos) = current.todos.iter().position(|t| t.id == id) {
            let mut item = current.todos.remove(pos);
            item.completed = !item.completed;
            if item.completed {
                item.completed_at = Some(Local::now().format("%I:%M %p").to_string());
            } else {
                item.completed_at = None;
            }

            if current.theme.completion_order == "queue" {
                if item.completed {
                    // Checked: moves to the very back in a queue
                    current.todos.push(item);
                } else {
                    // Unchecked: moves to the back side of the unchecked to-dos (before first completed todo)
                    if let Some(first_completed_idx) = current.todos.iter().position(|t| t.completed) {
                        current.todos.insert(first_completed_idx, item);
                    } else {
                        current.todos.push(item);
                    }
                }
            } else {
                // Stay in the same place
                current.todos.insert(pos, item);
            }
        }
        save_state(&current)?;
        current.clone()
    };

    broadcast_update(&ctx, &updated).await;
    Ok(updated)
}

#[tauri::command]
async fn edit_todo(id: String, text: String, ctx: State<'_, AppContext>) -> Result<OverlayState, String> {
    let text = text.trim().to_string();
    if text.is_empty() {
        return Err("Todo text cannot be empty".into());
    }

    let updated = {
        let mut current = ctx.state.write().await;
        if let Some(item) = current.todos.iter_mut().find(|t| t.id == id) {
            item.text = text;
        }
        save_state(&current)?;
        current.clone()
    };

    broadcast_update(&ctx, &updated).await;
    Ok(updated)
}

#[tauri::command]
async fn delete_todo(id: String, ctx: State<'_, AppContext>) -> Result<OverlayState, String> {
    let updated = {
        let mut current = ctx.state.write().await;
        current.todos.retain(|t| t.id != id);
        save_state(&current)?;
        current.clone()
    };

    broadcast_update(&ctx, &updated).await;
    Ok(updated)
}

#[tauri::command]
async fn reorder_todos(from_index: usize, to_index: usize, ctx: State<'_, AppContext>) -> Result<OverlayState, String> {
    let updated = {
        let mut current = ctx.state.write().await;
        let len = current.todos.len();
        if from_index < len && to_index < len {
            if current.theme.completion_order == "queue" {
                if current.todos[from_index].completed {
                    return Ok(current.clone());
                }
                let first_completed_idx = current.todos.iter().position(|t| t.completed).unwrap_or(len);
                let target_index = if first_completed_idx > 0 && to_index >= first_completed_idx {
                    first_completed_idx - 1
                } else {
                    to_index
                };
                let item = current.todos.remove(from_index);
                current.todos.insert(target_index, item);
                save_state(&current)?;
            } else {
                let item = current.todos.remove(from_index);
                current.todos.insert(to_index, item);
                save_state(&current)?;
            }
        }
        current.clone()
    };

    broadcast_update(&ctx, &updated).await;
    Ok(updated)
}

#[tauri::command]
async fn update_theme(theme: OverlayTheme, ctx: State<'_, AppContext>) -> Result<OverlayState, String> {
    let updated = {
        let mut current = ctx.state.write().await;
        let switching_to_queue = theme.completion_order == "queue" && current.theme.completion_order != "queue";
        current.theme = theme;
        if switching_to_queue {
            let mut unchecked: Vec<TodoItem> = current.todos.iter().filter(|t| !t.completed).cloned().collect();
            let mut checked: Vec<TodoItem> = current.todos.iter().filter(|t| t.completed).cloned().collect();
            unchecked.append(&mut checked);
            current.todos = unchecked;
        }
        save_state(&current)?;
        current.clone()
    };

    broadcast_update(&ctx, &updated).await;
    Ok(updated)
}

#[tauri::command]
async fn set_title(title: String, ctx: State<'_, AppContext>) -> Result<OverlayState, String> {
    let updated = {
        let mut current = ctx.state.write().await;
        current.title = title.trim().to_string();
        save_state(&current)?;
        current.clone()
    };

    broadcast_update(&ctx, &updated).await;
    Ok(updated)
}

#[tauri::command]
async fn update_history_retention(days: u32, ctx: State<'_, AppContext>) -> Result<OverlayState, String> {
    let updated = {
        let mut current = ctx.state.write().await;
        current.history_retention_days = days;
        prune_history(&mut current);
        save_state(&current)?;
        current.clone()
    };

    broadcast_update(&ctx, &updated).await;
    Ok(updated)
}

#[tauri::command]
async fn clear_history(ctx: State<'_, AppContext>) -> Result<OverlayState, String> {
    let updated = {
        let mut current = ctx.state.write().await;
        current.history.clear();
        save_state(&current)?;
        current.clone()
    };

    broadcast_update(&ctx, &updated).await;
    Ok(updated)
}

#[tauri::command]
async fn restore_history_todos(todos: Vec<TodoItem>, ctx: State<'_, AppContext>) -> Result<OverlayState, String> {
    let updated = {
        let mut current = ctx.state.write().await;
        for t in todos {
            current.todos.push(TodoItem {
                id: Uuid::new_v4().to_string(),
                text: t.text,
                completed: false,
                completed_at: None,
            });
        }
        save_state(&current)?;
        current.clone()
    };

    broadcast_update(&ctx, &updated).await;
    Ok(updated)
}

#[tauri::command]
async fn rollover_daily_todos(ctx: State<'_, AppContext>) -> Result<OverlayState, String> {
    let updated = {
        let mut current = ctx.state.write().await;
        if !current.todos.is_empty() {
            let now = Local::now();
            let date = now.format("%Y-%m-%d").to_string();
            let formatted_date = now.format("%A, %b %e, %Y").to_string();
            let completed_count = current.todos.iter().filter(|t| t.completed).count();
            let total_count = current.todos.len();
            let record = DailyHistoryRecord {
                id: Uuid::new_v4().to_string(),
                date,
                formatted_date,
                title: current.title.clone(),
                todos: current.todos.clone(),
                completed_count,
                total_count,
                archived_at: now.to_rfc3339(),
            };
            current.history.insert(0, record);
            current.todos.clear();
        }
        current.last_active_date = Local::now().format("%Y-%m-%d").to_string();
        prune_history(&mut current);
        save_state(&current)?;
        current.clone()
    };

    broadcast_update(&ctx, &updated).await;
    Ok(updated)
}


#[tauri::command]
fn minimize_main_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.minimize().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn toggle_maximize_main_window(app: AppHandle) -> Result<bool, String> {
    if let Some(window) = app.get_webview_window("main") {
        let is_max = window.is_maximized().unwrap_or(false);
        if is_max {
            window.unmaximize().map_err(|e| e.to_string())?;
            Ok(false)
        } else {
            window.maximize().map_err(|e| e.to_string())?;
            Ok(true)
        }
    } else {
        Err("Main window not found".into())
    }
}

#[tauri::command]
fn close_main_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn is_main_maximized(app: AppHandle) -> Result<bool, String> {
    if let Some(window) = app.get_webview_window("main") {
        Ok(window.is_maximized().unwrap_or(false))
    } else {
        Ok(false)
    }
}

#[tauri::command]
fn show_main_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.show().map_err(|e| e.to_string())?;
        window.unminimize().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn clamp_widget_to_screen(window: &tauri::Window) {
    if let Ok(Some(monitor)) = window.current_monitor() {
        let mon_pos = monitor.position();
        let mon_size = monitor.size();
        let win_size = window.outer_size().unwrap_or_default();
        if let Ok(pos) = window.outer_position() {
            let min_x = mon_pos.x;
            let max_x = (mon_pos.x + mon_size.width as i32 - win_size.width as i32).max(min_x);
            let min_y = mon_pos.y;
            let max_y = (mon_pos.y + mon_size.height as i32 - win_size.height as i32).max(min_y);

            let clamped_x = pos.x.clamp(min_x, max_x);
            let clamped_y = pos.y.clamp(min_y, max_y);

            if pos.x != clamped_x || pos.y != clamped_y {
                let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                    x: clamped_x,
                    y: clamped_y,
                }));
            }
        }
    }
}

#[tauri::command]
fn toggle_widget_window(app: AppHandle) -> Result<bool, String> {
    if let Some(window) = app.get_webview_window("widget") {
        let is_vis = window.is_visible().unwrap_or(false);
        if is_vis {
            window.hide().map_err(|e| e.to_string())?;
            Ok(false)
        } else {
            #[cfg(target_os = "windows")]
            if let Ok(hwnd) = window.hwnd() {
                windows_boundary::attach_boundary_subclass(hwnd);
            }
            clamp_widget_to_screen(&window.as_ref().window());
            window.show().map_err(|e| e.to_string())?;
            window.unminimize().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
            Ok(true)
        }
    } else {
        Err("Widget window not found".into())
    }
}

#[tauri::command]
fn close_widget_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("widget") {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn is_widget_open(app: AppHandle) -> Result<bool, String> {
    if let Some(window) = app.get_webview_window("widget") {
        Ok(window.is_visible().unwrap_or(false))
    } else {
        Ok(false)
    }
}

async fn broadcast_update(ctx: &AppContext, state: &OverlayState) {
    if let Some(app) = &*ctx.app.read().await {
        let _ = app.emit("state-changed", state);
    }
}

#[tauri::command]
fn get_app_install_info() -> Result<updater::AppInstallInfo, String> {
    updater::get_install_info()
}

#[tauri::command]
async fn download_and_apply_update(
    app: AppHandle,
    download_url: String,
    total_bytes: u64,
    is_portable: bool,
) -> Result<(), String> {
    updater::download_and_apply_update(app, download_url, total_bytes, is_portable).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    updater::cleanup_old_updates();

    let mut initial_state = load_state();
    if perform_daily_rollover(&mut initial_state) {
        let _ = save_state(&initial_state);
    }
    let shared_state = Arc::new(RwLock::new(initial_state));
    let app_handle_holder = Arc::new(RwLock::new(None));

    let app_context = AppContext {
        state: shared_state.clone(),
        app: app_handle_holder.clone(),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(app_context)
        .invoke_handler(tauri::generate_handler![
            get_state,
            set_state,
            add_todo,
            toggle_todo,
            edit_todo,
            delete_todo,
            reorder_todos,
            update_theme,
            set_title,
            update_history_retention,
            clear_history,
            restore_history_todos,
            rollover_daily_todos,
            minimize_main_window,
            toggle_maximize_main_window,
            close_main_window,
            is_main_maximized,
            show_main_window,
            toggle_widget_window,
            close_widget_window,
            is_widget_open,
            get_app_install_info,
            download_and_apply_update
        ])
        .setup(move |app| {
            let handle = app.handle().clone();
            let app_holder = app_handle_holder.clone();
            let loop_state = shared_state.clone();
            let loop_holder = app_handle_holder.clone();

            tauri::async_runtime::spawn(async move {
                *app_holder.write().await = Some(handle);
            });

            // Background task: precise 12:00 AM midnight rollover loop
            tauri::async_runtime::spawn(async move {
                loop {
                    let now = Local::now();
                    let next_midnight = match (now.date_naive() + Days::new(1)).and_hms_opt(0, 0, 1) {
                        Some(naive) => naive.and_local_timezone(Local).single().unwrap_or(now + Duration::hours(24)),
                        None => now + Duration::hours(24),
                    };
                    let wait_millis = (next_midnight - now).num_milliseconds().max(1000) as u64;
                    tokio::time::sleep(tokio::time::Duration::from_millis(wait_millis)).await;

                    let (should_broadcast, updated_state) = {
                        let mut state = loop_state.write().await;
                        if perform_daily_rollover(&mut state) {
                            let _ = save_state(&state);
                            (true, Some(state.clone()))
                        } else {
                            (false, None)
                        }
                    };

                    if should_broadcast {
                        if let (Some(app), Some(state)) = (&*loop_holder.read().await, updated_state) {
                            let _ = app.emit("state-changed", state);
                        }
                    }
                }
            });

            let show_app_item = MenuItem::with_id(app, "show_app", "Open Taskmaster Everywhere", true, None::<&str>)?;
            let toggle_widget_item = MenuItem::with_id(app, "toggle_widget", "Toggle Taskmaster Widget", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit Taskmaster Everywhere", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_app_item, &toggle_widget_item, &quit_item])?;

            let mut builder = TrayIconBuilder::new()
                .menu(&menu)
                .show_menu_on_left_click(false)
                .tooltip("Taskmaster Everywhere")
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "show_app" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                        "toggle_widget" => {
                            if let Some(window) = app.get_webview_window("widget") {
                                if window.is_visible().unwrap_or(false) {
                                    let _ = window.hide();
                                } else {
                                    let _ = window.show();
                                    let _ = window.unminimize();
                                    let _ = window.set_focus();
                                }
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                });

            if let Some(icon) = app.default_window_icon() {
                builder = builder.icon(icon.clone());
                if let Some(main_win) = app.get_webview_window("main") {
                    let _ = main_win.set_icon(icon.clone());
                }
                if let Some(widget_win) = app.get_webview_window("widget") {
                    let _ = widget_win.set_icon(icon.clone());
                }
            }

            let _tray = builder.build(app)?;

            if let Some(widget_win) = app.get_webview_window("widget") {
                #[cfg(target_os = "windows")]
                if let Ok(hwnd) = widget_win.hwnd() {
                    windows_boundary::attach_boundary_subclass(hwnd);
                }
                clamp_widget_to_screen(&widget_win.as_ref().window());
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // Keep application running in background when window is closed
                api.prevent_close();
                let _ = window.hide();
            }
            if window.label() == "widget" {
                match event {
                    WindowEvent::Moved(_) | WindowEvent::Resized(_) => {
                        clamp_widget_to_screen(window);
                    }
                    _ => {}
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
