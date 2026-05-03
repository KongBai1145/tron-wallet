use crate::models::wallet::Wallet;
use chrono::Utc;
use rusqlite::{Connection, Result};
use std::collections::HashMap;
use std::path::PathBuf;

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new() -> Result<Self> {
        let db_path = get_db_path();
        let conn = Connection::open(db_path)?;

        super::schema::initialize_database(&conn)?;

        Ok(Self { conn })
    }

    pub fn save_wallet(&self, wallet: &Wallet) -> Result<()> {
        self.conn.execute(
            "INSERT INTO wallets (id, name, address, wallet_type, encrypted_seed, salt, nonce, tag, derivation_path, network, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            rusqlite::params![
                wallet.id,
                wallet.name,
                wallet.address,
                wallet.wallet_type.to_string(),
                wallet.encrypted_seed,
                wallet.salt,
                wallet.nonce,
                wallet.tag,
                wallet.derivation_path,
                wallet.network,
                wallet.created_at.to_rfc3339(),
                wallet.updated_at.to_rfc3339(),
            ],
        )?;
        Ok(())
    }

    pub fn get_all_wallets(&self) -> Result<Vec<Wallet>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, address, wallet_type, encrypted_seed, salt, nonce, tag, derivation_path, network, created_at, updated_at FROM wallets ORDER BY created_at DESC"
        )?;

        let wallets = stmt.query_map([], |row| {
            Ok(Wallet {
                id: row.get(0)?,
                name: row.get(1)?,
                address: row.get(2)?,
                wallet_type: row.get::<_, String>(3)?.parse().unwrap_or(crate::models::wallet::WalletType::SingleSig),
                encrypted_seed: row.get(4)?,
                salt: row.get(5)?,
                nonce: row.get(6)?,
                tag: row.get(7)?,
                derivation_path: row.get(8)?,
                network: row.get(9)?,
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(10)?)
                    .unwrap_or_default()
                    .with_timezone(&chrono::Utc),
                updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(11)?)
                    .unwrap_or_default()
                    .with_timezone(&chrono::Utc),
            })
        })?.collect::<Result<Vec<_>>>()?;

        Ok(wallets)
    }

    pub fn get_wallet_by_id(&self, id: &str) -> Result<Option<Wallet>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, address, wallet_type, encrypted_seed, salt, nonce, tag, derivation_path, network, created_at, updated_at FROM wallets WHERE id = ?1"
        )?;

        let mut wallets = stmt.query_map(rusqlite::params![id], |row| {
            Ok(Wallet {
                id: row.get(0)?,
                name: row.get(1)?,
                address: row.get(2)?,
                wallet_type: row.get::<_, String>(3)?.parse().unwrap_or(crate::models::wallet::WalletType::SingleSig),
                encrypted_seed: row.get(4)?,
                salt: row.get(5)?,
                nonce: row.get(6)?,
                tag: row.get(7)?,
                derivation_path: row.get(8)?,
                network: row.get(9)?,
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(10)?)
                    .unwrap_or_default()
                    .with_timezone(&chrono::Utc),
                updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(11)?)
                    .unwrap_or_default()
                    .with_timezone(&chrono::Utc),
            })
        })?;

        wallets.next().transpose()
    }

    pub fn delete_wallet(&self, id: &str) -> Result<()> {
        self.conn.execute("DELETE FROM wallets WHERE id = ?1", rusqlite::params![id])?;
        Ok(())
    }

    pub fn get_all_settings(&self) -> Result<HashMap<String, String>> {
        let mut stmt = self.conn.prepare("SELECT key, value FROM settings")?;
        let settings = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?.collect::<Result<HashMap<_, _>>>()?;

        Ok(settings)
    }

    pub fn update_setting(&self, key: &str, value: &str) -> Result<()> {
        let now = Utc::now().to_rfc3339();
        self.conn.execute(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)",
            rusqlite::params![key, value, now],
        )?;
        Ok(())
    }

    // Address Book methods
    pub fn save_address_book_entry(
        &self,
        id: &str,
        name: &str,
        address: &str,
        network: &str,
        group: &str,
        tags: &str,
        is_favorite: bool,
        created_at: &str,
    ) -> Result<()> {
        self.conn.execute(
            "INSERT INTO address_book (id, name, address, network, \"group\", tags, is_favorite, created_at, last_used_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            rusqlite::params![id, name, address, network, group, tags, is_favorite as i32, created_at, created_at],
        )?;
        Ok(())
    }

    pub fn get_address_book_entries(&self) -> Result<Vec<serde_json::Value>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, address, network, \"group\", tags, is_favorite, created_at, last_used_at FROM address_book ORDER BY is_favorite DESC, created_at DESC"
        )?;

        let entries = stmt.query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "address": row.get::<_, String>(2)?,
                "network": row.get::<_, String>(3)?,
                "group": row.get::<_, String>(4)?,
                "tags": row.get::<_, String>(5)?,
                "is_favorite": row.get::<_, i32>(6)? != 0,
                "created_at": row.get::<_, String>(7)?,
                "last_used_at": row.get::<_, String>(8)?,
            }))
        })?.collect::<Result<Vec<_>>>()?;

        Ok(entries)
    }

    pub fn delete_address_book_entry(&self, id: &str) -> Result<()> {
        self.conn.execute("DELETE FROM address_book WHERE id = ?1", rusqlite::params![id])?;
        Ok(())
    }

    pub fn update_address_book_entry(
        &self,
        id: &str,
        name: &str,
        address: &str,
        group: &str,
        tags: &str,
        is_favorite: bool,
    ) -> Result<()> {
        self.conn.execute(
            "UPDATE address_book SET name = ?1, address = ?2, \"group\" = ?3, tags = ?4, is_favorite = ?5 WHERE id = ?6",
            rusqlite::params![name, address, group, tags, is_favorite as i32, id],
        )?;
        Ok(())
    }

    // Transaction methods
    pub fn save_transaction(
        &self,
        id: &str,
        wallet_id: &str,
        tx_hash: &str,
        block_number: i64,
        from_address: &str,
        to_address: &str,
        amount: &str,
        token_address: &str,
        token_symbol: &str,
        fee: &str,
        energy_used: i64,
        bandwidth_used: i64,
        memo: &str,
        status: &str,
        direction: &str,
        timestamp: &str,
    ) -> Result<()> {
        self.conn.execute(
            "INSERT INTO transactions (id, wallet_id, tx_hash, block_number, from_address, to_address, amount, token_address, token_symbol, fee, energy_used, bandwidth_used, memo, status, direction, timestamp)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
            rusqlite::params![
                id, wallet_id, tx_hash, block_number, from_address, to_address, amount,
                token_address, token_symbol, fee, energy_used, bandwidth_used, memo, status,
                direction, timestamp,
            ],
        )?;
        Ok(())
    }

    pub fn get_transactions(&self, wallet_id: &str, limit: u32) -> Result<Vec<serde_json::Value>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, tx_hash, block_number, from_address, to_address, amount, token_symbol, fee, status, direction, timestamp
             FROM transactions WHERE wallet_id = ?1 ORDER BY timestamp DESC LIMIT ?2"
        )?;

        let txs = stmt.query_map(rusqlite::params![wallet_id, limit], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "tx_hash": row.get::<_, String>(1)?,
                "block_number": row.get::<_, i64>(2)?,
                "from_address": row.get::<_, String>(3)?,
                "to_address": row.get::<_, String>(4)?,
                "amount": row.get::<_, String>(5)?,
                "token_symbol": row.get::<_, String>(6)?,
                "fee": row.get::<_, String>(7)?,
                "status": row.get::<_, String>(8)?,
                "direction": row.get::<_, String>(9)?,
                "timestamp": row.get::<_, String>(10)?,
            }))
        })?.collect::<Result<Vec<_>>>()?;

        Ok(txs)
    }

    // Multisig Proposal methods
    pub fn save_proposal(
        &self,
        id: &str,
        wallet_id: &str,
        title: &str,
        to_address: &str,
        amount_sun: u64,
        token_address: &str,
        raw_data_hex: &str,
        tx_id: &str,
        threshold: u64,
        created_at: &str,
    ) -> Result<()> {
        self.conn.execute(
            "INSERT INTO multisig_proposals (id, wallet_id, title, to_address, amount_sun, token_address, raw_data_hex, tx_id, threshold, current_weight, status, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, 'pending', ?10)",
            rusqlite::params![id, wallet_id, title, to_address, amount_sun as i64, token_address, raw_data_hex, tx_id, threshold as i64, created_at],
        )?;
        Ok(())
    }

    pub fn get_proposals_by_wallet(&self, wallet_id: &str) -> Result<Vec<serde_json::Value>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, wallet_id, title, to_address, amount_sun, token_address, raw_data_hex, tx_id, threshold, current_weight, status, created_at, expires_at, broadcast_tx_hash
             FROM multisig_proposals WHERE wallet_id = ?1 ORDER BY created_at DESC"
        )?;

        let proposals = stmt.query_map(rusqlite::params![wallet_id], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "wallet_id": row.get::<_, String>(1)?,
                "title": row.get::<_, String>(2)?,
                "to_address": row.get::<_, String>(3)?,
                "amount_sun": row.get::<_, i64>(4)?,
                "token_address": row.get::<_, Option<String>>(5)?,
                "raw_data_hex": row.get::<_, String>(6)?,
                "tx_id": row.get::<_, String>(7)?,
                "threshold": row.get::<_, i64>(8)?,
                "current_weight": row.get::<_, i64>(9)?,
                "status": row.get::<_, String>(10)?,
                "created_at": row.get::<_, String>(11)?,
                "expires_at": row.get::<_, Option<String>>(12)?,
                "broadcast_tx_hash": row.get::<_, Option<String>>(13)?,
            }))
        })?.collect::<Result<Vec<_>>>()?;

        Ok(proposals)
    }

    pub fn get_proposal_by_id(&self, id: &str) -> Result<Option<serde_json::Value>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, wallet_id, title, to_address, amount_sun, token_address, raw_data_hex, tx_id, threshold, current_weight, status, created_at, expires_at, broadcast_tx_hash
             FROM multisig_proposals WHERE id = ?1"
        )?;

        let mut proposals = stmt.query_map(rusqlite::params![id], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "wallet_id": row.get::<_, String>(1)?,
                "title": row.get::<_, String>(2)?,
                "to_address": row.get::<_, String>(3)?,
                "amount_sun": row.get::<_, i64>(4)?,
                "token_address": row.get::<_, Option<String>>(5)?,
                "raw_data_hex": row.get::<_, String>(6)?,
                "tx_id": row.get::<_, String>(7)?,
                "threshold": row.get::<_, i64>(8)?,
                "current_weight": row.get::<_, i64>(9)?,
                "status": row.get::<_, String>(10)?,
                "created_at": row.get::<_, String>(11)?,
                "expires_at": row.get::<_, Option<String>>(12)?,
                "broadcast_tx_hash": row.get::<_, Option<String>>(13)?,
            }))
        })?;

        proposals.next().transpose()
    }

    pub fn update_proposal_status(&self, id: &str, status: &str, current_weight: u64, broadcast_tx_hash: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE multisig_proposals SET status = ?1, current_weight = ?2, broadcast_tx_hash = ?3 WHERE id = ?4",
            rusqlite::params![status, current_weight as i64, broadcast_tx_hash, id],
        )?;
        Ok(())
    }

    pub fn save_signature(
        &self,
        id: &str,
        proposal_id: &str,
        signer_address: &str,
        signer_weight: u64,
        signature_hex: &str,
        signed_at: &str,
    ) -> Result<()> {
        self.conn.execute(
            "INSERT INTO multisig_signatures (id, proposal_id, signer_address, signer_weight, signature_hex, signed_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![id, proposal_id, signer_address, signer_weight as i64, signature_hex, signed_at],
        )?;
        Ok(())
    }

    pub fn get_signatures_by_proposal(&self, proposal_id: &str) -> Result<Vec<serde_json::Value>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, proposal_id, signer_address, signer_weight, signature_hex, signed_at
             FROM multisig_signatures WHERE proposal_id = ?1 ORDER BY signed_at ASC"
        )?;

        let signatures = stmt.query_map(rusqlite::params![proposal_id], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "proposal_id": row.get::<_, String>(1)?,
                "signer_address": row.get::<_, String>(2)?,
                "signer_weight": row.get::<_, i64>(3)?,
                "signature_hex": row.get::<_, String>(4)?,
                "signed_at": row.get::<_, String>(5)?,
            }))
        })?.collect::<Result<Vec<_>>>()?;

        Ok(signatures)
    }

    pub fn delete_proposal(&self, id: &str) -> Result<()> {
        self.conn.execute("DELETE FROM multisig_signatures WHERE proposal_id = ?1", rusqlite::params![id])?;
        self.conn.execute("DELETE FROM multisig_proposals WHERE id = ?1", rusqlite::params![id])?;
        Ok(())
    }
}

fn get_db_path() -> PathBuf {
    let mut path = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("tron-wallet");
    std::fs::create_dir_all(&path).ok();
    path.push("wallet.db");
    path
}
