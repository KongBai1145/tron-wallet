use crate::models::wallet::{CreateWalletRequest, ImportWalletRequest, WalletInfo};
use crate::network::tron_client::AccountResource;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_wallet(
    state: State<'_, AppState>,
    request: CreateWalletRequest,
) -> Result<WalletInfo, String> {
    let db = state.db.lock().await;
    let wallet = crate::core::wallet::create_wallet(&request.name, &request.password, request.wallet_type)
        .map_err(|e| e.to_string())?;

    db.save_wallet(&wallet).map_err(|e| e.to_string())?;

    // Store password hash if this is the first wallet
    let existing_wallets = db.get_all_wallets().map_err(|e| e.to_string())?;
    if existing_wallets.len() == 1 {
        let hash = crate::crypto::keystore::hash_password_for_verification(&request.password)
            .map_err(|e| e.to_string())?;
        db.update_setting("password_hash", &hash).map_err(|e| e.to_string())?;
    }

    Ok(WalletInfo::from(&wallet))
}

#[tauri::command]
pub async fn import_wallet(
    state: State<'_, AppState>,
    request: ImportWalletRequest,
) -> Result<WalletInfo, String> {
    let db = state.db.lock().await;

    let wallet = match request.wallet_type {
        crate::models::wallet::WalletType::SingleSig => {
            let secret = request.secret.trim();
            let password = request.password.ok_or("Password is required for single-sig import")?;

            let w = if secret.contains(' ') {
                crate::core::wallet::import_from_mnemonic(&request.name, secret, &password)
                    .map_err(|e| e.to_string())?
            } else {
                crate::core::wallet::import_from_private_key(&request.name, secret, &password)
                    .map_err(|e| e.to_string())?
            };

            // Store password hash if this is the first wallet
            let existing_wallets = db.get_all_wallets().map_err(|e| e.to_string())?;
            if existing_wallets.is_empty() {
                let hash = crate::crypto::keystore::hash_password_for_verification(&password)
                    .map_err(|e| e.to_string())?;
                db.update_setting("password_hash", &hash).map_err(|e| e.to_string())?;
            }

            w
        }
        crate::models::wallet::WalletType::WatchOnly => {
            crate::core::wallet::import_watch_only(&request.name, &request.secret)
                .map_err(|e| e.to_string())?
        }
        crate::models::wallet::WalletType::MultiSig => {
            crate::core::wallet::import_multisig(&request.name, &request.secret)
                .map_err(|e| e.to_string())?
        }
    };

    db.save_wallet(&wallet).map_err(|e| e.to_string())?;

    Ok(WalletInfo::from(&wallet))
}

#[tauri::command]
pub async fn get_wallets(state: State<'_, AppState>) -> Result<Vec<WalletInfo>, String> {
    let db = state.db.lock().await;
    let wallets = db.get_all_wallets().map_err(|e| e.to_string())?;

    Ok(wallets.iter().map(WalletInfo::from).collect())
}

#[tauri::command]
pub async fn get_wallet(state: State<'_, AppState>, id: String) -> Result<Option<WalletInfo>, String> {
    let db = state.db.lock().await;
    let wallet = db.get_wallet_by_id(&id).map_err(|e| e.to_string())?;

    Ok(wallet.map(|w| WalletInfo::from(&w)))
}

#[tauri::command]
pub async fn delete_wallet(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().await;
    db.delete_wallet(&id).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_account_info(
    _state: State<'_, AppState>,
    address: String,
    network: String,
) -> Result<AccountResource, String> {
    let client = crate::network::tron_client::TronClient::new(&network);
    client.get_account_full(&address).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_trx_price() -> Result<serde_json::Value, String> {
    let url = "https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd&include_24hr_change=true&include_market_cap=true";
    let client = reqwest::Client::new();
    let resp = client.get(url).send().await.map_err(|e| e.to_string())?;
    let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    Ok(data)
}

#[tauri::command]
pub async fn get_now_block(network: String) -> Result<serde_json::Value, String> {
    let base_url = if network == "shasta" {
        "https://api.shasta.trongrid.io"
    } else {
        "https://api.trongrid.io"
    };
    let url = format!("{}/wallet/getnowblock", base_url);
    let client = reqwest::Client::new();
    let resp = client.post(&url).send().await.map_err(|e| e.to_string())?;
    let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let block_number = data["block_header"]["raw_data"]["number"].as_u64().unwrap_or(0);
    Ok(serde_json::json!({ "block_number": block_number }))
}

#[tauri::command]
pub async fn get_transactions(
    address: String,
    network: String,
    limit: u32,
    fingerprint: Option<String>,
) -> Result<serde_json::Value, String> {
    let base_url = if network == "shasta" { "https://api.shasta.trongrid.io" } else { "https://api.trongrid.io" };
    let mut url = format!(
        "{}/v1/accounts/{}/transactions?limit={}&order_by=block_timestamp,desc",
        base_url, address, limit
    );
    if let Some(fp) = fingerprint {
        url.push_str(&format!("&fingerprint={}", fp));
    }
    let http_client = reqwest::Client::new();
    let resp = http_client.get(&url).send().await.map_err(|e| e.to_string())?;
    let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    Ok(data)
}

// Address Book commands
#[derive(serde::Deserialize)]
pub struct SaveAddressRequest {
    pub name: String,
    pub address: String,
    pub group: Option<String>,
    pub tags: Option<String>,
    pub is_favorite: Option<bool>,
}

#[tauri::command]
pub async fn save_address(
    state: State<'_, AppState>,
    request: SaveAddressRequest,
) -> Result<String, String> {
    let db = state.db.lock().await;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    db.save_address_book_entry(
        &id,
        &request.name,
        &request.address,
        "mainnet",
        request.group.as_deref().unwrap_or(""),
        request.tags.as_deref().unwrap_or(""),
        request.is_favorite.unwrap_or(false),
        &now,
    ).map_err(|e| e.to_string())?;

    Ok(id)
}

#[tauri::command]
pub async fn get_addresses(
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db.lock().await;
    let entries = db.get_address_book_entries().map_err(|e| e.to_string())?;
    Ok(entries)
}

#[tauri::command]
pub async fn delete_address(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    let db = state.db.lock().await;
    db.delete_address_book_entry(&id).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn update_address(
    state: State<'_, AppState>,
    id: String,
    name: String,
    address: String,
    group: Option<String>,
    tags: Option<String>,
    is_favorite: Option<bool>,
) -> Result<(), String> {
    let db = state.db.lock().await;
    db.update_address_book_entry(
        &id,
        &name,
        &address,
        group.as_deref().unwrap_or(""),
        tags.as_deref().unwrap_or(""),
        is_favorite.unwrap_or(false),
    ).map_err(|e| e.to_string())?;
    Ok(())
}

// Transaction history commands
#[tauri::command]
pub async fn save_transaction(
    state: State<'_, AppState>,
    wallet_id: String,
    tx_hash: String,
    from_address: String,
    to_address: String,
    amount: String,
    token_symbol: String,
    fee: String,
    status: String,
    direction: String,
    timestamp: String,
) -> Result<(), String> {
    let db = state.db.lock().await;
    let id = uuid::Uuid::new_v4().to_string();

    db.save_transaction(
        &id,
        &wallet_id,
        &tx_hash,
        0, // block_number
        &from_address,
        &to_address,
        &amount,
        "", // token_address
        &token_symbol,
        &fee,
        0, // energy_used
        0, // bandwidth_used
        "", // memo
        &status,
        &direction,
        &timestamp,
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn get_saved_transactions(
    state: State<'_, AppState>,
    wallet_id: String,
    limit: u32,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db.lock().await;
    let txs = db.get_transactions(&wallet_id, limit).map_err(|e| e.to_string())?;
    Ok(txs)
}

#[derive(serde::Deserialize)]
pub struct SendTrxRequest {
    pub wallet_id: String,
    pub password: String,
    pub to_address: String,
    pub amount_sun: u64,
    pub network: String,
}

#[tauri::command]
pub async fn send_trx(
    state: State<'_, AppState>,
    request: SendTrxRequest,
) -> Result<String, String> {
    // Get wallet
    let db = state.db.lock().await;
    let wallet = db.get_wallet_by_id(&request.wallet_id)
        .map_err(|e| e.to_string())?
        .ok_or("Wallet not found")?;

    // Decrypt private key
    let seed = crate::core::wallet::decrypt_seed(&wallet, &request.password)
        .map_err(|e| format!("Wrong password: {}", e))?;

    // Derive private key from seed
    let private_key = derive_key_from_seed(&seed)?;

    // Send TRX
    let tx_id = crate::core::transaction::send_trx(
        &wallet.address,
        &request.to_address,
        request.amount_sun,
        &private_key,
        &request.network,
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(tx_id)
}

#[derive(serde::Deserialize)]
pub struct SendTrc20Request {
    pub wallet_id: String,
    pub password: String,
    pub to_address: String,
    pub contract_address: String,
    pub amount: String, // String to handle large numbers
    pub fee_limit: u64,
    pub network: String,
}

#[tauri::command]
pub async fn send_trc20(
    state: State<'_, AppState>,
    request: SendTrc20Request,
) -> Result<String, String> {
    let db = state.db.lock().await;
    let wallet = db.get_wallet_by_id(&request.wallet_id)
        .map_err(|e| e.to_string())?
        .ok_or("Wallet not found")?;

    let seed = crate::core::wallet::decrypt_seed(&wallet, &request.password)
        .map_err(|e| format!("Wrong password: {}", e))?;

    let private_key = derive_key_from_seed(&seed)?;

    let amount = request.amount.parse::<u128>()
        .map_err(|_| "Invalid amount")?;

    let tx_id = crate::core::transaction::send_trc20(
        &wallet.address,
        &request.to_address,
        &request.contract_address,
        amount,
        request.fee_limit,
        &private_key,
        &request.network,
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(tx_id)
}

/// Derive secp256k1 private key from seed using HMAC-SHA512 (same as core/tron.rs)
fn derive_key_from_seed(seed: &[u8]) -> Result<[u8; 32], String> {
    use hmac::{Hmac, Mac};
    use sha2::Sha512;

    type HmacSha512 = Hmac<Sha512>;

    let mut mac = HmacSha512::new_from_slice(b"tron wallet")
        .map_err(|_| "HMAC creation failed")?;
    mac.update(seed);
    let result = mac.finalize();
    let bytes = result.into_bytes();

    let mut key = [0u8; 32];
    key.copy_from_slice(&bytes[..32]);
    Ok(key)
}

// Freeze/Unfreeze (Staking) commands

#[derive(serde::Deserialize)]
pub struct FreezeRequest {
    pub wallet_id: String,
    pub password: String,
    pub amount_sun: u64,
    pub resource_type: String, // "BANDWIDTH" or "ENERGY"
    pub network: String,
}

#[tauri::command]
pub async fn freeze_balance(
    state: State<'_, AppState>,
    request: FreezeRequest,
) -> Result<String, String> {
    let db = state.db.lock().await;
    let wallet = db.get_wallet_by_id(&request.wallet_id)
        .map_err(|e| e.to_string())?
        .ok_or("Wallet not found")?;

    let seed = crate::core::wallet::decrypt_seed(&wallet, &request.password)
        .map_err(|e| format!("Wrong password: {}", e))?;
    let private_key = derive_key_from_seed(&seed)?;

    let base_url = match request.network.as_str() {
        "shasta" => "https://api.shasta.trongrid.io",
        _ => "https://api.trongrid.io",
    };

    let client = reqwest::Client::new();

    // Build FreezeBalanceV2 contract
    let body = serde_json::json!({
        "owner_address": wallet.address,
        "frozen_balance": request.amount_sun,
        "resource": request.resource_type,
        "visible": true
    });

    let url = format!("{}/wallet/freezebalancev2", base_url);
    let mut tx: serde_json::Value = client.post(&url)
        .json(&body)
        .send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;

    if tx["raw_data_hex"].is_null() {
        let msg = tx["message"].as_str().unwrap_or("Freeze failed");
        return Err(format!("Freeze failed: {}", msg).into());
    }

    // Sign
    crate::core::transaction::sign_transaction(&mut tx, &private_key)
        .map_err(|e| e.to_string())?;

    // Broadcast
    let broadcast_url = format!("{}/wallet/broadcasttransaction", base_url);
    let resp: serde_json::Value = client.post(&broadcast_url)
        .json(&tx).send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;

    if resp["result"].as_bool().unwrap_or(false) {
        Ok(resp["txid"].as_str().unwrap_or("").to_string())
    } else {
        Err(format!("Broadcast failed: {}", resp["message"].as_str().unwrap_or("unknown")).into())
    }
}

#[tauri::command]
pub async fn unfreeze_balance(
    state: State<'_, AppState>,
    request: FreezeRequest,
) -> Result<String, String> {
    let db = state.db.lock().await;
    let wallet = db.get_wallet_by_id(&request.wallet_id)
        .map_err(|e| e.to_string())?
        .ok_or("Wallet not found")?;

    let seed = crate::core::wallet::decrypt_seed(&wallet, &request.password)
        .map_err(|e| format!("Wrong password: {}", e))?;
    let private_key = derive_key_from_seed(&seed)?;

    let base_url = match request.network.as_str() {
        "shasta" => "https://api.shasta.trongrid.io",
        _ => "https://api.trongrid.io",
    };

    let client = reqwest::Client::new();

    let body = serde_json::json!({
        "owner_address": wallet.address,
        "unfreeze_balance": request.amount_sun,
        "resource": request.resource_type,
        "visible": true
    });

    let url = format!("{}/wallet/unfreezebalancev2", base_url);
    let mut tx: serde_json::Value = client.post(&url)
        .json(&body)
        .send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;

    if tx["raw_data_hex"].is_null() {
        let msg = tx["message"].as_str().unwrap_or("Unfreeze failed");
        return Err(format!("Unfreeze failed: {}", msg).into());
    }

    crate::core::transaction::sign_transaction(&mut tx, &private_key)
        .map_err(|e| e.to_string())?;

    let broadcast_url = format!("{}/wallet/broadcasttransaction", base_url);
    let resp: serde_json::Value = client.post(&broadcast_url)
        .json(&tx).send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;

    if resp["result"].as_bool().unwrap_or(false) {
        Ok(resp["txid"].as_str().unwrap_or("").to_string())
    } else {
        Err(format!("Broadcast failed: {}", resp["message"].as_str().unwrap_or("unknown")).into())
    }
}

// Voting commands

#[tauri::command]
pub async fn get_super_representatives(
    network: String,
) -> Result<Vec<serde_json::Value>, String> {
    let base_url = match network.as_str() {
        "shasta" => "https://api.shasta.trongrid.io",
        _ => "https://api.trongrid.io",
    };

    let client = reqwest::Client::new();
    let url = format!("{}/wallet/listwitnesses", base_url);
    let resp: serde_json::Value = client.get(&url)
        .send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;

    let mut srs = Vec::new();
    if let Some(witnesses) = resp["witnesses"].as_array() {
        for (i, w) in witnesses.iter().enumerate() {
            srs.push(serde_json::json!({
                "address": w["address"].as_str().unwrap_or(""),
                "name": w["url"].as_str().unwrap_or("").split('/').last().unwrap_or("").to_string(),
                "url": w["url"].as_str().unwrap_or(""),
                "vote_count": w["voteCount"].as_i64().unwrap_or(0),
                "produced_blocks": w["totalProduced"].as_i64().unwrap_or(0),
                "is_active": i < 27,
            }));
        }
    }

    Ok(srs)
}

#[derive(serde::Deserialize)]
pub struct VoteRequest {
    pub wallet_id: String,
    pub password: String,
    pub votes: Vec<VoteEntry>,
    pub network: String,
}

#[derive(serde::Deserialize)]
pub struct VoteEntry {
    pub address: String,
    pub vote_count: u64,
}

#[tauri::command]
pub async fn cast_vote(
    state: State<'_, AppState>,
    request: VoteRequest,
) -> Result<String, String> {
    let db = state.db.lock().await;
    let wallet = db.get_wallet_by_id(&request.wallet_id)
        .map_err(|e| e.to_string())?
        .ok_or("Wallet not found")?;

    let seed = crate::core::wallet::decrypt_seed(&wallet, &request.password)
        .map_err(|e| format!("Wrong password: {}", e))?;
    let private_key = derive_key_from_seed(&seed)?;

    let base_url = match request.network.as_str() {
        "shasta" => "https://api.shasta.trongrid.io",
        _ => "https://api.trongrid.io",
    };

    let client = reqwest::Client::new();

    // Build vote witness contract
    let votes: Vec<serde_json::Value> = request.votes.iter().map(|v| {
        serde_json::json!({
            "vote_address": v.address,
            "vote_count": v.vote_count,
        })
    }).collect();

    let body = serde_json::json!({
        "owner_address": wallet.address,
        "votes": votes,
        "visible": true
    });

    let url = format!("{}/wallet/votewitnessaccount", base_url);
    let mut tx: serde_json::Value = client.post(&url)
        .json(&body)
        .send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;

    if tx["raw_data_hex"].is_null() {
        let msg = tx["message"].as_str().unwrap_or("Vote failed");
        return Err(format!("Vote failed: {}", msg).into());
    }

    crate::core::transaction::sign_transaction(&mut tx, &private_key)
        .map_err(|e| e.to_string())?;

    let broadcast_url = format!("{}/wallet/broadcasttransaction", base_url);
    let resp: serde_json::Value = client.post(&broadcast_url)
        .json(&tx).send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;

    if resp["result"].as_bool().unwrap_or(false) {
        Ok(resp["txid"].as_str().unwrap_or("").to_string())
    } else {
        Err(format!("Broadcast failed: {}", resp["message"].as_str().unwrap_or("unknown")).into())
    }
}

// Resource Delegation commands (Stake 2.0)

#[derive(serde::Deserialize)]
pub struct DelegateRequest {
    pub wallet_id: String,
    pub password: String,
    pub amount_sun: u64,
    pub resource_type: String,
    pub receiver_address: String,
    pub lock: Option<bool>,
    pub network: String,
}

#[tauri::command]
pub async fn delegate_resource(
    state: State<'_, AppState>,
    request: DelegateRequest,
) -> Result<String, String> {
    let db = state.db.lock().await;
    let wallet = db.get_wallet_by_id(&request.wallet_id)
        .map_err(|e| e.to_string())?
        .ok_or("Wallet not found")?;

    let seed = crate::core::wallet::decrypt_seed(&wallet, &request.password)
        .map_err(|e| format!("Wrong password: {}", e))?;
    let private_key = derive_key_from_seed(&seed)?;

    let base_url = match request.network.as_str() {
        "shasta" => "https://api.shasta.trongrid.io",
        _ => "https://api.trongrid.io",
    };

    let client = reqwest::Client::new();

    let body = serde_json::json!({
        "owner_address": wallet.address,
        "receiver_address": request.receiver_address,
        "balance": request.amount_sun,
        "resource": request.resource_type,
        "lock": request.lock.unwrap_or(false),
        "visible": true
    });

    let url = format!("{}/wallet/delegateresource", base_url);
    let mut tx: serde_json::Value = client.post(&url)
        .json(&body)
        .send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;

    if tx["raw_data_hex"].is_null() {
        let msg = tx["message"].as_str().unwrap_or("Delegate failed");
        return Err(format!("Delegate failed: {}", msg).into());
    }

    crate::core::transaction::sign_transaction(&mut tx, &private_key)
        .map_err(|e| e.to_string())?;

    let broadcast_url = format!("{}/wallet/broadcasttransaction", base_url);
    let resp: serde_json::Value = client.post(&broadcast_url)
        .json(&tx).send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;

    if resp["result"].as_bool().unwrap_or(false) {
        Ok(resp["txid"].as_str().unwrap_or("").to_string())
    } else {
        Err(format!("Broadcast failed: {}", resp["message"].as_str().unwrap_or("unknown")).into())
    }
}

#[tauri::command]
pub async fn undelegate_resource(
    state: State<'_, AppState>,
    request: DelegateRequest,
) -> Result<String, String> {
    let db = state.db.lock().await;
    let wallet = db.get_wallet_by_id(&request.wallet_id)
        .map_err(|e| e.to_string())?
        .ok_or("Wallet not found")?;

    let seed = crate::core::wallet::decrypt_seed(&wallet, &request.password)
        .map_err(|e| format!("Wrong password: {}", e))?;
    let private_key = derive_key_from_seed(&seed)?;

    let base_url = match request.network.as_str() {
        "shasta" => "https://api.shasta.trongrid.io",
        _ => "https://api.trongrid.io",
    };

    let client = reqwest::Client::new();

    let body = serde_json::json!({
        "owner_address": wallet.address,
        "receiver_address": request.receiver_address,
        "balance": request.amount_sun,
        "resource": request.resource_type,
        "visible": true
    });

    let url = format!("{}/wallet/undelegateresource", base_url);
    let mut tx: serde_json::Value = client.post(&url)
        .json(&body)
        .send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;

    if tx["raw_data_hex"].is_null() {
        let msg = tx["message"].as_str().unwrap_or("Undelegate failed");
        return Err(format!("Undelegate failed: {}", msg).into());
    }

    crate::core::transaction::sign_transaction(&mut tx, &private_key)
        .map_err(|e| e.to_string())?;

    let broadcast_url = format!("{}/wallet/broadcasttransaction", base_url);
    let resp: serde_json::Value = client.post(&broadcast_url)
        .json(&tx).send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;

    if resp["result"].as_bool().unwrap_or(false) {
        Ok(resp["txid"].as_str().unwrap_or("").to_string())
    } else {
        Err(format!("Broadcast failed: {}", resp["message"].as_str().unwrap_or("unknown")).into())
    }
}

// Withdraw expired unfreeze (Stake 2.0)

#[derive(serde::Deserialize)]
pub struct WithdrawRequest {
    pub wallet_id: String,
    pub password: String,
    pub network: String,
}

#[tauri::command]
pub async fn withdraw_expired_unfreeze(
    state: State<'_, AppState>,
    request: WithdrawRequest,
) -> Result<String, String> {
    let db = state.db.lock().await;
    let wallet = db.get_wallet_by_id(&request.wallet_id)
        .map_err(|e| e.to_string())?
        .ok_or("Wallet not found")?;

    let seed = crate::core::wallet::decrypt_seed(&wallet, &request.password)
        .map_err(|e| format!("Wrong password: {}", e))?;
    let private_key = derive_key_from_seed(&seed)?;

    let base_url = match request.network.as_str() {
        "shasta" => "https://api.shasta.trongrid.io",
        _ => "https://api.trongrid.io",
    };

    let client = reqwest::Client::new();

    let body = serde_json::json!({
        "owner_address": wallet.address,
        "visible": true
    });

    let url = format!("{}/wallet/withdrawexpireunfreeze", base_url);
    let mut tx: serde_json::Value = client.post(&url)
        .json(&body)
        .send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;

    if tx["raw_data_hex"].is_null() {
        let msg = tx["message"].as_str().unwrap_or("Withdraw failed");
        return Err(format!("Withdraw failed: {}", msg).into());
    }

    crate::core::transaction::sign_transaction(&mut tx, &private_key)
        .map_err(|e| e.to_string())?;

    let broadcast_url = format!("{}/wallet/broadcasttransaction", base_url);
    let resp: serde_json::Value = client.post(&broadcast_url)
        .json(&tx).send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;

    if resp["result"].as_bool().unwrap_or(false) {
        Ok(resp["txid"].as_str().unwrap_or("").to_string())
    } else {
        Err(format!("Broadcast failed: {}", resp["message"].as_str().unwrap_or("unknown")).into())
    }
}

// Claim SR block rewards

#[tauri::command]
pub async fn claim_rewards(
    state: State<'_, AppState>,
    request: WithdrawRequest,
) -> Result<String, String> {
    let db = state.db.lock().await;
    let wallet = db.get_wallet_by_id(&request.wallet_id)
        .map_err(|e| e.to_string())?
        .ok_or("Wallet not found")?;

    let seed = crate::core::wallet::decrypt_seed(&wallet, &request.password)
        .map_err(|e| format!("Wrong password: {}", e))?;
    let private_key = derive_key_from_seed(&seed)?;

    let base_url = match request.network.as_str() {
        "shasta" => "https://api.shasta.trongrid.io",
        _ => "https://api.trongrid.io",
    };

    let client = reqwest::Client::new();

    let body = serde_json::json!({
        "owner_address": wallet.address,
        "visible": true
    });

    let url = format!("{}/wallet/withdrawbalance", base_url);
    let mut tx: serde_json::Value = client.post(&url)
        .json(&body)
        .send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;

    if tx["raw_data_hex"].is_null() {
        let msg = tx["message"].as_str().unwrap_or("Claim failed");
        return Err(format!("Claim failed: {}", msg).into());
    }

    crate::core::transaction::sign_transaction(&mut tx, &private_key)
        .map_err(|e| e.to_string())?;

    let broadcast_url = format!("{}/wallet/broadcasttransaction", base_url);
    let resp: serde_json::Value = client.post(&broadcast_url)
        .json(&tx).send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;

    if resp["result"].as_bool().unwrap_or(false) {
        Ok(resp["txid"].as_str().unwrap_or("").to_string())
    } else {
        Err(format!("Broadcast failed: {}", resp["message"].as_str().unwrap_or("unknown")).into())
    }
}

// Energy estimation for TRC-20 transfers

#[tauri::command]
pub async fn estimate_energy(
    from: String,
    contract: String,
    to: String,
    amount: String,
    network: String,
) -> Result<serde_json::Value, String> {
    let base_url = match network.as_str() {
        "shasta" => "https://api.shasta.trongrid.io",
        _ => "https://api.trongrid.io",
    };

    let client = reqwest::Client::new();

    let to_hex = if to.starts_with('T') {
        let decoded = bs58::decode(&to).into_vec()
            .map_err(|_| "Invalid to address")?;
        hex::encode(&decoded[1..21])
    } else {
        to.trim_start_matches("0x").to_string()
    };

    let amount_val = amount.parse::<u128>().map_err(|_| "Invalid amount")?;
    let data = format!(
        "a9059cbb{}{:064x}",
        format!("{:0>64}", to_hex),
        amount_val
    );

    let body = serde_json::json!({
        "owner_address": from,
        "contract_address": contract,
        "function_selector": "transfer(address,uint256)",
        "parameter": data,
        "visible": true
    });

    let url = format!("{}/wallet/estimateenergy", base_url);
    let resp: serde_json::Value = client.post(&url)
        .json(&body)
        .send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;

    Ok(resp)
}

// TRC-20 Token Metadata

#[derive(serde::Serialize)]
pub struct TokenInfo {
    pub contract_address: String,
    pub symbol: String,
    pub name: String,
    pub decimals: u32,
}

#[tauri::command]
pub async fn get_trc20_token_info(
    contract_addresses: Vec<String>,
    network: String,
) -> Result<Vec<TokenInfo>, String> {
    let base_url = match network.as_str() {
        "shasta" => "https://api.shasta.trongrid.io",
        _ => "https://api.trongrid.io",
    };

    let client = reqwest::Client::new();
    let mut results = Vec::new();

    for addr in &contract_addresses {
        let mut info = TokenInfo {
            contract_address: addr.clone(),
            symbol: String::new(),
            name: String::new(),
            decimals: 6,
        };

        // Fetch decimals
        if let Ok(resp) = call_contract_view(&client, base_url, addr, "decimals()").await {
            let result_arr = resp["constant_result"].as_array();
            if let Some(arr) = result_arr {
                if let Some(val) = arr.first() {
                    if let Some(hex_str) = val.as_str() {
                        if let Ok(bytes) = hex::decode(hex_str.trim_start_matches("0x")) {
                            if bytes.len() >= 32 {
                                info.decimals = u32::from_be_bytes([
                                    bytes[bytes.len() - 4],
                                    bytes[bytes.len() - 3],
                                    bytes[bytes.len() - 2],
                                    bytes[bytes.len() - 1],
                                ]);
                            }
                        }
                    }
                }
            }
        }

        // Fetch symbol
        if let Ok(resp) = call_contract_view(&client, base_url, addr, "symbol()").await {
            let result_arr = resp["constant_result"].as_array();
            if let Some(arr) = result_arr {
                if let Some(val) = arr.first() {
                    if let Some(hex_str) = val.as_str() {
                        info.symbol = decode_abi_string(hex_str);
                    }
                }
            }
        }

        // Fetch name
        if let Ok(resp) = call_contract_view(&client, base_url, addr, "name()").await {
            let result_arr = resp["constant_result"].as_array();
            if let Some(arr) = result_arr {
                if let Some(val) = arr.first() {
                    if let Some(hex_str) = val.as_str() {
                        info.name = decode_abi_string(hex_str);
                    }
                }
            }
        }

        results.push(info);
    }

    Ok(results)
}

async fn call_contract_view(
    client: &reqwest::Client,
    base_url: &str,
    contract: &str,
    function: &str,
) -> Result<serde_json::Value, reqwest::Error> {
    let url = format!("{}/wallet/triggerconstantcontract", base_url);
    let body = serde_json::json!({
        "owner_address": "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb",
        "contract_address": contract,
        "function_selector": function,
        "parameter": "",
        "visible": true
    });

    let resp: serde_json::Value = client.post(&url)
        .json(&body)
        .send()
        .await?
        .json()
        .await?;
    Ok(resp)
}

fn decode_abi_string(hex_str: &str) -> String {
    let hex_str = hex_str.trim_start_matches("0x");
    if let Ok(bytes) = hex::decode(hex_str) {
        // ABI-encoded string: offset (32 bytes) + length (32 bytes) + data
        if bytes.len() >= 64 {
            let offset = usize::from_be_bytes([
                0, 0, 0, 0,
                bytes[28], bytes[29], bytes[30], bytes[31],
            ]);
            if offset + 32 < bytes.len() {
                let length = usize::from_be_bytes([
                    0, 0, 0, 0,
                    bytes[offset + 28],
                    bytes[offset + 29],
                    bytes[offset + 30],
                    bytes[offset + 31],
                ]);
                let start = offset + 32;
                let end = start + length;
                if end <= bytes.len() {
                    return String::from_utf8_lossy(&bytes[start..end]).to_string();
                }
            }
        }
        // Fallback: try to read as raw UTF-8 (some tokens use non-standard encoding)
        if bytes.len() > 0 {
            return String::from_utf8_lossy(&bytes).trim_matches('\0').to_string();
        }
    }
    String::new()
}

#[tauri::command]
pub async fn create_unsigned_proposal(
    state: State<'_, AppState>,
    wallet_id: String,
    to_address: String,
    amount_sun: u64,
    network: String,
) -> Result<serde_json::Value, String> {
    let db = state.db.lock().await;
    let wallet = db.get_wallet_by_id(&wallet_id)
        .map_err(|e| e.to_string())?
        .ok_or("Wallet not found")?;

    if !matches!(wallet.wallet_type, crate::models::wallet::WalletType::MultiSig) {
        return Err("Not a multisig wallet".to_string());
    }

    // Get owner permission to determine threshold
    let client = crate::network::tron_client::TronClient::new(&network);
    let account_info = client.get_account_full(&wallet.address).await.map_err(|e| e.to_string())?;
    let threshold = account_info.owner_permission
        .map(|p| p.threshold)
        .unwrap_or(1);

    let base_url = match network.as_str() {
        "shasta" => "https://api.shasta.trongrid.io",
        _ => "https://api.trongrid.io",
    };

    // Create unsigned transaction
    let http_client = reqwest::Client::new();
    let create_url = format!("{}/wallet/createtransaction", base_url);
    let body = serde_json::json!({
        "owner_address": wallet.address,
        "to_address": to_address,
        "amount": amount_sun,
        "visible": true
    });

    let tx: serde_json::Value = http_client
        .post(&create_url)
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    if let Some(err) = tx["Error"].as_str() {
        return Err(format!("Transaction creation failed: {}", err));
    }
    if tx["raw_data_hex"].is_null() && tx["raw_data"].is_null() {
        let msg = tx["message"].as_str().unwrap_or("Unknown error");
        return Err(format!("Transaction creation failed: {}", msg));
    }

    let tx_id = tx["txID"].as_str().unwrap_or_default().to_string();
    let raw_data_hex = tx["raw_data_hex"].as_str()
        .or_else(|| tx["raw_data"].as_str())
        .unwrap_or_default()
        .to_string();

    // Store proposal in database
    let proposal_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let title = format!("Send {} TRX to {}...", amount_sun / 1_000_000, &to_address[..10]);

    db.save_proposal(
        &proposal_id,
        &wallet_id,
        &title,
        &to_address,
        amount_sun,
        "",
        &raw_data_hex,
        &tx_id,
        threshold,
        &now,
    ).map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "proposal_id": proposal_id,
        "unsigned_tx": tx,
        "threshold": threshold,
    }))
}

#[tauri::command]
pub async fn get_proposals(
    state: State<'_, AppState>,
    wallet_id: String,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db.lock().await;
    let proposals = db.get_proposals_by_wallet(&wallet_id).map_err(|e| e.to_string())?;
    Ok(proposals)
}

#[tauri::command]
pub async fn get_proposal(
    state: State<'_, AppState>,
    proposal_id: String,
) -> Result<serde_json::Value, String> {
    let db = state.db.lock().await;
    let proposal = db.get_proposal_by_id(&proposal_id).map_err(|e| e.to_string())?;
    proposal.ok_or_else(|| "Proposal not found".to_string())
}

#[tauri::command]
pub async fn add_signature(
    state: State<'_, AppState>,
    proposal_id: String,
    signature_hex: String,
    signer_address: String,
    network: String,
) -> Result<serde_json::Value, String> {
    let db = state.db.lock().await;

    // Get proposal
    let proposal = db.get_proposal_by_id(&proposal_id).map_err(|e| e.to_string())?
        .ok_or("Proposal not found")?;

    let wallet_id = proposal["wallet_id"].as_str().unwrap_or_default();
    let wallet = db.get_wallet_by_id(wallet_id).map_err(|e| e.to_string())?
        .ok_or("Wallet not found")?;

    // Get owner permission to find signer weight
    let client = crate::network::tron_client::TronClient::new(&network);
    let account_info = client.get_account_full(&wallet.address).await.map_err(|e| e.to_string())?;

    let signer_weight = account_info.owner_permission
        .and_then(|p| {
            p.keys.iter().find(|k| k.address == signer_address)
                .map(|k| k.weight)
        })
        .unwrap_or(1);

    // Store signature
    let sig_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    db.save_signature(
        &sig_id,
        &proposal_id,
        &signer_address,
        signer_weight,
        &signature_hex,
        &now,
    ).map_err(|e| e.to_string())?;

    // Update current weight
    let signatures = db.get_signatures_by_proposal(&proposal_id).map_err(|e| e.to_string())?;
    let current_weight: u64 = signatures.iter()
        .map(|s| s["signer_weight"].as_u64().unwrap_or(1))
        .sum();

    let threshold = proposal["threshold"].as_u64().unwrap_or(1);
    let status = if current_weight >= threshold { "ready" } else { "pending" };

    db.update_proposal_status(&proposal_id, status, current_weight, "").map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "proposal_id": proposal_id,
        "current_weight": current_weight,
        "threshold": threshold,
        "status": status,
    }))
}

#[tauri::command]
pub async fn broadcast_proposal(
    state: State<'_, AppState>,
    proposal_id: String,
    network: String,
) -> Result<String, String> {
    let db = state.db.lock().await;

    // Get proposal
    let proposal = db.get_proposal_by_id(&proposal_id).map_err(|e| e.to_string())?
        .ok_or("Proposal not found")?;

    let status = proposal["status"].as_str().unwrap_or_default();
    if status != "ready" {
        return Err("Proposal not ready for broadcast. Need more signatures.".to_string());
    }

    let raw_data_hex = proposal["raw_data_hex"].as_str().unwrap_or_default();
    let tx_id = proposal["tx_id"].as_str().unwrap_or_default();

    // Get all signatures
    let signatures = db.get_signatures_by_proposal(&proposal_id).map_err(|e| e.to_string())?;

    // Build transaction JSON
    let tx = serde_json::json!({
        "raw_data_hex": raw_data_hex,
        "txID": tx_id,
        "signature": signatures.iter()
            .map(|s| s["signature_hex"].as_str().unwrap_or_default())
            .collect::<Vec<_>>(),
    });

    // Broadcast
    let base_url = match network.as_str() {
        "shasta" => "https://api.shasta.trongrid.io",
        _ => "https://api.trongrid.io",
    };

    let client = reqwest::Client::new();
    let broadcast_url = format!("{}/wallet/broadcasttransaction", base_url);
    let resp: serde_json::Value = client
        .post(&broadcast_url)
        .json(&tx)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    if resp["result"].as_bool().unwrap_or(false) {
        let broadcast_tx_hash = resp["txid"].as_str()
            .or_else(|| tx["txID"].as_str())
            .unwrap_or_default()
            .to_string();

        // Update proposal status
        db.update_proposal_status(&proposal_id, "broadcasted", proposal["current_weight"].as_u64().unwrap_or(0), &broadcast_tx_hash)
            .map_err(|e| e.to_string())?;

        Ok(broadcast_tx_hash)
    } else {
        let msg = resp["message"].as_str()
            .or_else(|| resp["code"].as_str())
            .unwrap_or("Broadcast failed");
        Err(format!("Broadcast failed: {}", msg))
    }
}

#[tauri::command]
pub async fn get_proposal_signatures(
    state: State<'_, AppState>,
    proposal_id: String,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db.lock().await;
    let signatures = db.get_signatures_by_proposal(&proposal_id).map_err(|e| e.to_string())?;
    Ok(signatures)
}

#[tauri::command]
pub async fn delete_proposal(
    state: State<'_, AppState>,
    proposal_id: String,
) -> Result<(), String> {
    let db = state.db.lock().await;
    db.delete_proposal(&proposal_id).map_err(|e| e.to_string())?;
    Ok(())
}
