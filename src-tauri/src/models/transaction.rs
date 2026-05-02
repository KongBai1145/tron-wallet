use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TransactionStatus {
    Pending,
    Confirmed,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TransactionDirection {
    In,
    Out,
    SelfTransfer,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub id: String,
    pub wallet_id: String,
    pub tx_hash: String,
    pub block_number: Option<i64>,
    pub from_address: String,
    pub to_address: String,
    pub amount: String,
    pub token_address: Option<String>,
    pub token_symbol: Option<String>,
    pub fee: Option<String>,
    pub energy_used: Option<i64>,
    pub bandwidth_used: Option<i64>,
    pub memo: Option<String>,
    pub status: TransactionStatus,
    pub direction: TransactionDirection,
    pub timestamp: DateTime<Utc>,
}
