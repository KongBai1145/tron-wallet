use std::time::Duration;

pub struct ClipboardManager;

impl ClipboardManager {
    pub fn copy(text: &str) -> Result<(), Box<dyn std::error::Error>> {
        #[cfg(target_os = "windows")]
        {
            clipboard_win::raw::set_string(text)
                .map_err(|e| format!("Failed to copy to clipboard: {:?}", e))?;
        }
        Ok(())
    }

    pub fn copy_with_auto_clear(text: &str, clear_after_secs: u64) -> Result<(), Box<dyn std::error::Error>> {
        Self::copy(text)?;

        let text = text.to_string();
        std::thread::spawn(move || {
            std::thread::sleep(Duration::from_secs(clear_after_secs));
            Self::clear_if_matches(&text).ok();
        });

        Ok(())
    }

    fn clear_if_matches(expected: &str) -> Result<(), Box<dyn std::error::Error>> {
        #[cfg(target_os = "windows")]
        {
            let current: String = clipboard_win::get(clipboard_win::formats::Unicode)
                .unwrap_or_default();
            if current == expected {
                clipboard_win::raw::set_string("")
                    .map_err(|e| format!("Failed to clear clipboard: {:?}", e))?;
            }
        }
        Ok(())
    }

    pub fn clear() -> Result<(), Box<dyn std::error::Error>> {
        #[cfg(target_os = "windows")]
        {
            clipboard_win::raw::set_string("")
                .map_err(|e| format!("Failed to clear clipboard: {:?}", e))?;
        }
        Ok(())
    }
}
