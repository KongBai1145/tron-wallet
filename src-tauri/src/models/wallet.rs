use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WalletType {
    #[serde(rename = "single")]
    SingleSig,
    #[serde(rename = "multisig")]
    MultiSig,
    #[serde(rename = "watch")]
    WatchOnly,
}

impl std::fmt::Display for WalletType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            WalletType::SingleSig => write!(f, "single"),
            WalletType::MultiSig => write!(f, "multisig"),
            WalletType::WatchOnly => write!(f, "watch"),
        }
    }
}

impl std::str::FromStr for WalletType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "single" => Ok(WalletType::SingleSig),
            "multisig" => Ok(WalletType::MultiSig),
            "watch" => Ok(WalletType::WatchOnly),
            _ => Err(format!("Unknown wallet type: {}", s)),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Wallet {
    pub id: String,
    pub name: String,
    pub address: String,
    pub wallet_type: WalletType,
    pub encrypted_seed: Option<Vec<u8>>,
    pub salt: Vec<u8>,
    pub nonce: Vec<u8>,
    pub tag: Vec<u8>,
    pub derivation_path: Option<String>,
    pub network: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateWalletRequest {
    pub name: String,
    pub password: String,
    pub wallet_type: WalletType,
}

#[derive(Debug, Deserialize)]
pub struct ImportWalletRequest {
    pub name: String,
    pub wallet_type: WalletType,
    pub secret: String,
    pub password: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct WalletInfo {
    pub id: String,
    pub name: String,
    pub address: String,
    pub wallet_type: String,
    pub network: String,
    pub created_at: String,
}

impl From<&Wallet> for WalletInfo {
    fn from(wallet: &Wallet) -> Self {
        WalletInfo {
            id: wallet.id.clone(),
            name: wallet.name.clone(),
            address: wallet.address.clone(),
            wallet_type: wallet.wallet_type.to_string(),
            network: wallet.network.clone(),
            created_at: wallet.created_at.to_rfc3339(),
        }
    }
}
