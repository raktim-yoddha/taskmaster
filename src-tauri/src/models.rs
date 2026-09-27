use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TodoItem {
    pub id: String,
    pub text: String,
    pub completed: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DailyHistoryRecord {
    pub id: String,
    pub date: String,
    pub formatted_date: String,
    pub title: String,
    pub todos: Vec<TodoItem>,
    pub completed_count: usize,
    pub total_count: usize,
    pub archived_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct OverlayTheme {
    pub card_color: String,
    pub text_color: String,
    pub accent_color: String,
    pub opacity: u32,
    pub blur: u32,
    pub width: u32,
    pub radius: u32,
    pub padding: u32,
    pub spacing: u32,
    pub font: String,
    pub density: String,
    pub show_title: bool,
    pub progress_style: String,
    pub completed_style: String,
    pub animation: String,
    #[serde(default = "default_completion_order")]
    pub completion_order: String,
}

fn default_completion_order() -> String {
    "maintain".to_string()
}

impl Default for OverlayTheme {
    fn default() -> Self {
        Self {
            card_color: "#0a0c10".to_string(), // deep onyx dark
            text_color: "#ffffff".to_string(),
            accent_color: "#60a5fa".to_string(), // modern blue
            opacity: 96,
            blur: 20,
            width: 440,
            radius: 20,
            padding: 22,
            spacing: 12,
            font: "inter".to_string(),
            density: "comfortable".to_string(),
            show_title: true,
            progress_style: "both".to_string(),
            completed_style: "strike".to_string(),
            animation: "subtle".to_string(),
            completion_order: "maintain".to_string(),
        }
    }
}

pub fn default_history_retention() -> u32 {
    7
}

pub fn default_daily_reset_time() -> String {
    "00:00".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct NoteItem {
    pub id: String,
    pub title: String,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct OverlayState {
    pub title: String,
    pub todos: Vec<TodoItem>,
    pub theme: OverlayTheme,
    #[serde(default = "default_history_retention")]
    pub history_retention_days: u32,
    #[serde(default = "default_daily_reset_time")]
    pub daily_reset_time: String,
    #[serde(default)]
    pub history: Vec<DailyHistoryRecord>,
    #[serde(default)]
    pub last_active_date: String,
    #[serde(default)]
    pub notes: Vec<NoteItem>,
    #[serde(default)]
    pub active_note_id: Option<String>,
}

impl Default for OverlayState {
    fn default() -> Self {
        Self {
            title: "TONIGHT'S GOAL".to_string(),
            todos: vec![
                TodoItem {
                    id: "todo-1".to_string(),
                    text: "Make a desktop app for to do overlay".to_string(),
                    completed: false,
                    completed_at: None,
                },
                TodoItem {
                    id: "todo-2".to_string(),
                    text: "improve Orchestration layer Edge cases".to_string(),
                    completed: false,
                    completed_at: None,
                },
                TodoItem {
                    id: "todo-3".to_string(),
                    text: "Fix the browser use feature edge cases".to_string(),
                    completed: false,
                    completed_at: None,
                },
                TodoItem {
                    id: "todo-4".to_string(),
                    text: "Release version 0.2.1".to_string(),
                    completed: false,
                    completed_at: None,
                },
                TodoItem {
                    id: "todo-5".to_string(),
                    text: "40 hours watch time".to_string(),
                    completed: false,
                    completed_at: None,
                },
            ],
            theme: OverlayTheme::default(),
            history_retention_days: 7,
            daily_reset_time: "00:00".to_string(),
            history: Vec::new(),
            last_active_date: chrono::Local::now().format("%Y-%m-%d").to_string(),
            notes: vec![
                NoteItem {
                    id: "note-1".to_string(),
                    title: "Welcome to Notes".to_string(),
                    content: "# Welcome to Taskmaster Notes 📝\n\nThis is your lightweight **Markdown scratchpad**, synchronized between your desktop and sticky widget.\n\n### Markdown Features Supported:\n- **Bold** & *Italics*\n- [x] Completed task checklist\n- [ ] Pending task checklist\n- `inline code` and code blocks\n- > Blockquotes for thoughts\n- Bullet points and numbered lists\n\nClick **Save** anytime to preserve changes, and switch notes using the selector above!".to_string(),
                    created_at: chrono::Local::now().to_rfc3339(),
                    updated_at: chrono::Local::now().to_rfc3339(),
                }
            ],
            active_note_id: Some("note-1".to_string()),
        }
    }
}
