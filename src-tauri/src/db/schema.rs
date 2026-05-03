use rusqlite::{Connection, Result};

pub fn initialize_database(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS wallets (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            address TEXT NOT NULL UNIQUE,
            wallet_type TEXT NOT NULL,
            encrypted_seed BLOB,
            salt BLOB NOT NULL,
            nonce BLOB NOT NULL,
            tag BLOB NOT NULL,
            derivation_path TEXT,
            network TEXT NOT NULL DEFAULT 'mainnet',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            wallet_id TEXT NOT NULL,
            tx_hash TEXT NOT NULL,
            block_number INTEGER,
            from_address TEXT NOT NULL,
            to_address TEXT NOT NULL,
            amount TEXT NOT NULL,
            token_address TEXT,
            token_symbol TEXT,
            fee TEXT,
            energy_used INTEGER,
            bandwidth_used INTEGER,
            memo TEXT,
            status TEXT NOT NULL,
            direction TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (wallet_id) REFERENCES wallets(id)
        );

        CREATE TABLE IF NOT EXISTS address_book (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            address TEXT NOT NULL,
            network TEXT NOT NULL,
            \"group\" TEXT,
            tags TEXT,
            is_favorite INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            last_used_at TEXT
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS multisig_proposals (
            id TEXT PRIMARY KEY,
            wallet_id TEXT NOT NULL,
            title TEXT NOT NULL,
            to_address TEXT NOT NULL,
            amount_sun INTEGER NOT NULL,
            token_address TEXT,
            raw_data_hex TEXT NOT NULL,
            tx_id TEXT NOT NULL,
            threshold INTEGER NOT NULL,
            current_weight INTEGER DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL,
            expires_at TEXT,
            broadcast_tx_hash TEXT,
            FOREIGN KEY (wallet_id) REFERENCES wallets(id)
        );

        CREATE TABLE IF NOT EXISTS multisig_signatures (
            id TEXT PRIMARY KEY,
            proposal_id TEXT NOT NULL,
            signer_address TEXT NOT NULL,
            signer_weight INTEGER NOT NULL,
            signature_hex TEXT NOT NULL,
            signed_at TEXT NOT NULL,
            FOREIGN KEY (proposal_id) REFERENCES multisig_proposals(id)
        );

        CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);
        CREATE INDEX IF NOT EXISTS idx_address_book_group ON address_book(\"group\");
        CREATE INDEX IF NOT EXISTS idx_proposals_wallet ON multisig_proposals(wallet_id);
        CREATE INDEX IF NOT EXISTS idx_signatures_proposal ON multisig_signatures(proposal_id);
        "
    )?;

    Ok(())
}
