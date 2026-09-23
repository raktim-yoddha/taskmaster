use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TodoItem {
    pub id: String,
    pub text: String,
    pub completed: bool,
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct OverlayState {
    pub title: String,
    pub todos: Vec<TodoItem>,
    pub theme: OverlayTheme,
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
                },
                TodoItem {
                    id: "todo-2".to_string(),
                    text: "improve Orchestration layer Edge cases".to_string(),
                    completed: false,
                },
                TodoItem {
                    id: "todo-3".to_string(),
                    text: "Fix the browser use feature edge cases".to_string(),
                    completed: false,
                },
                TodoItem {
                    id: "todo-4".to_string(),
                    text: "Release version 0.2.1".to_string(),
                    completed: false,
                },
                TodoItem {
                    id: "todo-5".to_string(),
                    text: "40 hours watch time".to_string(),
                    completed: false,
                },
            ],
            theme: OverlayTheme::default(),
        }
    }
}
