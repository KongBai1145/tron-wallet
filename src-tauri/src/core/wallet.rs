use crate::crypto::keystore::Keystore;
use crate::crypto::mnemonic::MnemonicGenerator;
use crate::models::wallet::{Wallet, WalletType};
use chrono::Utc;
use rand::RngCore;
use uuid::Uuid;

pub fn create_wallet(
    name: &str,
    password: &str,
    wallet_type: WalletType,
) -> Result<Wallet, Box<dyn std::error::Error>> {
    let mnemonic = MnemonicGenerator::generate(12)?;
    let seed = MnemonicGenerator::to_seed(&mnemonic, "")?;

    let keystore = Keystore::encrypt(&seed, password)?;

    let address = crate::core::tron::derive_address(&seed)?;

    let now = Utc::now();
    Ok(Wallet {
        id: Uuid::new_v4().to_string(),
        name: name.to_string(),
        address,
        wallet_type,
        encrypted_seed: Some(keystore.encrypted_data.clone()),
        salt: keystore.salt.clone(),
        nonce: keystore.nonce.clone(),
        tag: keystore.tag.clone(),
        derivation_path: Some("m/44'/195'/0'/0/0".to_string()),
        network: "mainnet".to_string(),
        created_at: now,
        updated_at: now,
    })
}

pub fn import_from_mnemonic(
    name: &str,
    mnemonic_phrase: &str,
    password: &str,
) -> Result<Wallet, Box<dyn std::error::Error>> {
    if !crate::crypto::mnemonic::MnemonicGenerator::validate(mnemonic_phrase) {
        return Err("Invalid mnemonic phrase".into());
    }

    let seed = crate::crypto::mnemonic::MnemonicGenerator::to_seed(mnemonic_phrase, "")?;
    let keystore = Keystore::encrypt(&seed, password)?;
    let address = crate::core::tron::derive_address(&seed)?;

    let now = Utc::now();
    Ok(Wallet {
        id: Uuid::new_v4().to_string(),
        name: name.to_string(),
        address,
        wallet_type: WalletType::SingleSig,
        encrypted_seed: Some(keystore.encrypted_data.clone()),
        salt: keystore.salt.clone(),
        nonce: keystore.nonce.clone(),
        tag: keystore.tag.clone(),
        derivation_path: Some("m/44'/195'/0'/0/0".to_string()),
        network: "mainnet".to_string(),
        created_at: now,
        updated_at: now,
    })
}

pub fn import_from_private_key(
    name: &str,
    private_key_hex: &str,
    password: &str,
) -> Result<Wallet, Box<dyn std::error::Error>> {
    let key_bytes = hex::decode(private_key_hex.trim().replace("0x", ""))
        .map_err(|e| format!("Invalid private key hex: {}", e))?;

    if key_bytes.len() != 32 {
        return Err("Private key must be 32 bytes".into());
    }

    let keystore = Keystore::encrypt(&key_bytes, password)?;

    // Derive secp256k1 public key (uncompressed, 65 bytes)
    use k256::elliptic_curve::sec1::ToEncodedPoint;
    let secret_key = k256::SecretKey::from_slice(&key_bytes)
        .map_err(|e| format!("Invalid private key: {}", e))?;
    let public_key = secret_key.public_key();
    let encoded = public_key.to_encoded_point(false);
    let address = crate::core::tron::public_key_to_address(encoded.as_bytes())?;

    let now = Utc::now();
    Ok(Wallet {
        id: Uuid::new_v4().to_string(),
        name: name.to_string(),
        address,
        wallet_type: WalletType::SingleSig,
        encrypted_seed: Some(keystore.encrypted_data.clone()),
        salt: keystore.salt.clone(),
        nonce: keystore.nonce.clone(),
        tag: keystore.tag.clone(),
        derivation_path: None,
        network: "mainnet".to_string(),
        created_at: now,
        updated_at: now,
    })
}

pub fn import_watch_only(
    name: &str,
    address: &str,
) -> Result<Wallet, Box<dyn std::error::Error>> {
    let addr = address.trim();
    if !addr.starts_with('T') || addr.len() != 34 {
        return Err("Invalid TRON address format (must start with T and be 34 characters)".into());
    }

    // Validate base58check
    bs58::decode(addr).into_vec()
        .map_err(|_| "Invalid TRON address: not valid base58")?;

    let now = Utc::now();
    // Generate dummy salt/nonce/tag for watch-only wallets (no encryption needed)
    let mut salt = vec![0u8; 32];
    let mut nonce = vec![0u8; 12];
    let mut tag = vec![0u8; 16];
    let mut rng = rand::thread_rng();
    rng.fill_bytes(&mut salt);
    rng.fill_bytes(&mut nonce);
    rng.fill_bytes(&mut tag);

    Ok(Wallet {
        id: Uuid::new_v4().to_string(),
        name: name.to_string(),
        address: addr.to_string(),
        wallet_type: WalletType::WatchOnly,
        encrypted_seed: None,
        salt,
        nonce,
        tag,
        derivation_path: None,
        network: "mainnet".to_string(),
        created_at: now,
        updated_at: now,
    })
}

pub fn import_multisig(
    name: &str,
    address: &str,
) -> Result<Wallet, Box<dyn std::error::Error>> {
    let addr = address.trim();
    if !addr.starts_with('T') || addr.len() != 34 {
        return Err("Invalid TRON address format (must start with T and be 34 characters)".into());
    }

    bs58::decode(addr).into_vec()
        .map_err(|_| "Invalid TRON address: not valid base58")?;

    let now = Utc::now();
    let mut salt = vec![0u8; 32];
    let mut nonce = vec![0u8; 12];
    let mut tag = vec![0u8; 16];
    let mut rng = rand::thread_rng();
    rng.fill_bytes(&mut salt);
    rng.fill_bytes(&mut nonce);
    rng.fill_bytes(&mut tag);

    Ok(Wallet {
        id: Uuid::new_v4().to_string(),
        name: name.to_string(),
        address: addr.to_string(),
        wallet_type: WalletType::MultiSig,
        encrypted_seed: None,
        salt,
        nonce,
        tag,
        derivation_path: None,
        network: "mainnet".to_string(),
        created_at: now,
        updated_at: now,
    })
}

pub fn decrypt_seed(wallet: &Wallet, password: &str) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let encrypted = wallet.encrypted_seed.as_ref()
        .ok_or("Wallet has no encrypted seed")?;

    let keystore = Keystore {
        encrypted_data: encrypted.clone(),
        salt: wallet.salt.clone(),
        nonce: wallet.nonce.clone(),
        tag: wallet.tag.clone(),
    };

    Keystore::decrypt(&keystore, password)
}
