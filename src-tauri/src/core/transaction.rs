use sha2::{Digest, Sha256};

/// Sign a TRON transaction received from TronGrid API.
///
/// TRON uses ECDSA secp256k1 signing:
/// 1. Decode raw_data hex to bytes
/// 2. SHA-256 hash the bytes
/// 3. ECDSA sign the hash with secp256k1
/// 4. Produce 65-byte signature: r (32) + s (32) + v (1)
pub fn sign_transaction(
    tx: &mut serde_json::Value,
    private_key: &[u8; 32],
) -> Result<(), Box<dyn std::error::Error>> {
    let raw_data_hex = tx["raw_data_hex"]
        .as_str()
        .or_else(|| tx["raw_data"].as_str())
        .ok_or("Transaction missing raw_data_hex")?;

    let raw_bytes = hex::decode(raw_data_hex)
        .map_err(|e| format!("Invalid raw_data hex: {}", e))?;

    // SHA-256 hash the raw data
    let mut hasher = Sha256::new();
    hasher.update(&raw_bytes);
    let hash = hasher.finalize();

    // ECDSA secp256k1 sign
    use k256::ecdsa::{RecoveryId, Signature, SigningKey};
    let signing_key = SigningKey::from_slice(private_key)
        .map_err(|e| format!("Invalid private key: {}", e))?;

    let (signature, recovery_id): (Signature, RecoveryId) = signing_key
        .sign_recoverable(hash.as_ref())
        .map_err(|e| format!("Signing failed: {}", e))?;

    // Build 65-byte signature: r (32) + s (32) + v (1)
    // TRON uses v = recovery_id + 27 (same as Ethereum convention)
    let sig_bytes = signature.to_bytes();
    let r = &sig_bytes[..32];
    let s = &sig_bytes[32..];
    let v = recovery_id.to_byte() + 27;

    let mut full_sig = Vec::with_capacity(65);
    full_sig.extend_from_slice(r);
    full_sig.extend_from_slice(s);
    full_sig.push(v);

    let sig_hex = hex::encode(&full_sig);

    if let Some(signatures) = tx["signature"].as_array_mut() {
        signatures.push(serde_json::Value::String(sig_hex));
    } else {
        tx["signature"] = serde_json::json!([sig_hex]);
    }

    tx["txID"] = serde_json::Value::String(hex::encode(hash));

    Ok(())
}

/// Build and sign a TRX transfer transaction.
pub async fn send_trx(
    from: &str,
    to: &str,
    amount_sun: u64,
    private_key: &[u8; 32],
    network: &str,
) -> Result<String, Box<dyn std::error::Error>> {
    let base_url = match network {
        "shasta" => "https://api.shasta.trongrid.io",
        _ => "https://api.trongrid.io",
    };

    let client = reqwest::Client::new();

    let create_url = format!("{}/wallet/createtransaction", base_url);
    let body = serde_json::json!({
        "owner_address": from,
        "to_address": to,
        "amount": amount_sun,
        "visible": true
    });

    let mut tx: serde_json::Value = client
        .post(&create_url)
        .json(&body)
        .send()
        .await?
        .json()
        .await?;

    if let Some(err) = tx["Error"].as_str() {
        return Err(format!("Transaction creation failed: {}", err).into());
    }
    if tx["raw_data_hex"].is_null() && tx["raw_data"].is_null() {
        let msg = tx["message"].as_str().unwrap_or("Unknown error");
        return Err(format!("Transaction creation failed: {}", msg).into());
    }

    sign_transaction(&mut tx, private_key)?;

    let broadcast_url = format!("{}/wallet/broadcasttransaction", base_url);
    let resp: serde_json::Value = client
        .post(&broadcast_url)
        .json(&tx)
        .send()
        .await?
        .json()
        .await?;

    if resp["result"].as_bool().unwrap_or(false) {
        let tx_id = resp["txid"]
            .as_str()
            .or_else(|| tx["txID"].as_str())
            .unwrap_or("")
            .to_string();
        Ok(tx_id)
    } else {
        let msg = resp["message"]
            .as_str()
            .or_else(|| resp["code"].as_str())
            .unwrap_or("Broadcast failed");
        Err(format!("Broadcast failed: {}", msg).into())
    }
}

/// Build and sign a TRC-20 token transfer transaction.
pub async fn send_trc20(
    from: &str,
    to: &str,
    contract: &str,
    amount: u128,
    fee_limit: u64,
    private_key: &[u8; 32],
    network: &str,
) -> Result<String, Box<dyn std::error::Error>> {
    let base_url = match network {
        "shasta" => "https://api.shasta.trongrid.io",
        _ => "https://api.trongrid.io",
    };

    let client = reqwest::Client::new();

    // ERC-20 transfer: transfer(address,uint256)
    // selector: 0xa9059cbb
    let to_hex = if to.starts_with('T') {
        let decoded = bs58::decode(to).into_vec()
            .map_err(|_| "Invalid to address")?;
        hex::encode(&decoded[1..21])
    } else {
        to.trim_start_matches("0x").to_string()
    };

    let data = format!(
        "a9059cbb{}{:064x}",
        format!("{:0>64}", to_hex),
        amount
    );

    let trigger_url = format!("{}/wallet/triggersmartcontract", base_url);
    let body = serde_json::json!({
        "owner_address": from,
        "contract_address": contract,
        "function_selector": "transfer(address,uint256)",
        "parameter": data,
        "fee_limit": fee_limit,
        "visible": true
    });

    let resp: serde_json::Value = client
        .post(&trigger_url)
        .json(&body)
        .send()
        .await?
        .json()
        .await?;

    if !resp["result"]["result"].as_bool().unwrap_or(false) {
        let msg = resp["result"]["message"]
            .as_str()
            .unwrap_or("Smart contract call failed");
        return Err(msg.into());
    }

    let mut tx = resp["transaction"].clone();

    sign_transaction(&mut tx, private_key)?;

    let broadcast_url = format!("{}/wallet/broadcasttransaction", base_url);
    let broadcast_resp: serde_json::Value = client
        .post(&broadcast_url)
        .json(&tx)
        .send()
        .await?
        .json()
        .await?;

    if broadcast_resp["result"].as_bool().unwrap_or(false) {
        let tx_id = broadcast_resp["txid"]
            .as_str()
            .or_else(|| tx["txID"].as_str())
            .unwrap_or("")
            .to_string();
        Ok(tx_id)
    } else {
        let msg = broadcast_resp["message"]
            .as_str()
            .unwrap_or("Broadcast failed");
        Err(format!("Broadcast failed: {}", msg).into())
    }
}
