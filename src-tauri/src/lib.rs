pub mod commands;
pub mod core;
pub mod crypto;
pub mod db;
pub mod models;
pub mod network;
pub mod utils;

use db::repository::Database;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct AppState {
    pub db: Arc<Mutex<Database>>,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to TRON Wallet.", name)
}

pub fn run() {
    tracing_subscriber::fmt::init();

    let db = Database::new().expect("Failed to initialize database");
    let state = AppState {
        db: Arc::new(Mutex::new(db)),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::wallet::create_wallet,
            commands::wallet::import_wallet,
            commands::wallet::get_wallets,
            commands::wallet::get_wallet,
            commands::wallet::delete_wallet,
            commands::wallet::get_account_info,
            commands::wallet::get_trx_price,
            commands::wallet::get_transactions,
            commands::wallet::save_address,
            commands::wallet::get_addresses,
            commands::wallet::delete_address,
            commands::wallet::update_address,
            commands::wallet::save_transaction,
            commands::wallet::get_saved_transactions,
            commands::wallet::send_trx,
            commands::wallet::send_trc20,
            commands::wallet::freeze_balance,
            commands::wallet::unfreeze_balance,
            commands::wallet::get_super_representatives,
            commands::wallet::cast_vote,
            commands::wallet::delegate_resource,
            commands::wallet::undelegate_resource,
            commands::wallet::withdraw_expired_unfreeze,
            commands::wallet::claim_rewards,
            commands::wallet::estimate_energy,
            commands::wallet::get_trc20_token_info,
            commands::wallet::get_now_block,
            commands::wallet::create_multisig_proposal,
            commands::settings::get_settings,
            commands::settings::update_setting,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
