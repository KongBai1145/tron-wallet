use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_settings(
    state: State<'_, AppState>,
) -> Result<std::collections::HashMap<String, String>, String> {
    let db = state.db.lock().await;
    db.get_all_settings().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_setting(
    state: State<'_, AppState>,
    key: String,
    value: String,
) -> Result<(), String> {
    let db = state.db.lock().await;
    db.update_setting(&key, &value).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn verify_password(
    state: State<'_, AppState>,
) -> Result<bool, String> {
    let db = state.db.lock().await;
    let settings = db.get_all_settings().map_err(|e| e.to_string())?;
    let stored_hash = settings.get("password_hash");
    Ok(stored_hash.is_some())
}

#[tauri::command]
pub async fn check_password(
    state: State<'_, AppState>,
    password: String,
) -> Result<bool, String> {
    let db = state.db.lock().await;
    let settings = db.get_all_settings().map_err(|e| e.to_string())?;
    let stored_hash = settings.get("password_hash").ok_or("No password set")?;
    crate::crypto::keystore::verify_password_hash(&password, stored_hash)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn setup_password_hash(
    state: State<'_, AppState>,
    password: String,
) -> Result<(), String> {
    let db = state.db.lock().await;
    let hash = crate::crypto::keystore::hash_password_for_verification(&password)
        .map_err(|e| e.to_string())?;
    db.update_setting("password_hash", &hash).map_err(|e| e.to_string())
}
