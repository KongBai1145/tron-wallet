use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone)]
pub struct TronClient {
    client: Client,
    base_url: String,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct AccountInfo {
    pub address: String,
    pub balance: u64,
    pub create_time: u64,
    #[serde(rename = "latest_opration_time")]
    pub latest_operation_time: u64,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct Trc20Token {
    pub contract_address: String,
    pub symbol: String,
    pub name: String,
    pub balance: String,
    pub decimals: u32,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct UnfreezeInfo {
    pub amount: u64,
    pub unfreeze_expire_time: u64,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct AccountResource {
    pub bandwidth_limit: u64,
    pub bandwidth_used: u64,
    pub energy_limit: u64,
    pub energy_used: u64,
    pub trx_balance: u64,
    pub frozen_for_bandwidth: u64,
    pub frozen_for_energy: u64,
    pub tron_power: u64,
    pub trc20_tokens: Vec<Trc20Token>,
    pub unfrozen_list: Vec<UnfreezeInfo>,
    pub withdrawable_balance: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransactionRecord {
    #[serde(rename = "txID")]
    pub tx_id: String,
    #[serde(rename = "blockNumber")]
    pub block_number: u64,
    #[serde(rename = "blockTimeStamp")]
    pub block_timestamp: u64,
    pub owner_address: Option<String>,
    pub to_address: Option<String>,
    pub amount: Option<u64>,
    pub contract_type: Option<String>,
    pub confirmed: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransactionReceipt {
    pub energy_usage: Option<u64>,
    pub energy_fee: Option<u64>,
    pub net_usage: Option<u64>,
    pub net_fee: Option<u64>,
    pub result: String,
}

impl TronClient {
    pub fn new(network: &str) -> Self {
        let base_url = match network {
            "mainnet" => "https://api.trongrid.io",
            "shasta" => "https://api.shasta.trongrid.io",
            _ => "https://api.trongrid.io",
        };

        Self {
            client: Client::new(),
            base_url: base_url.to_string(),
        }
    }

    pub async fn get_account(&self, address: &str) -> Result<AccountInfo, reqwest::Error> {
        let url = format!("{}/v1/accounts/{}", self.base_url, address);
        let resp: serde_json::Value = self.client.get(&url).send().await?.json().await?;

        let data = &resp["data"];
        if data.is_null() || !data.is_array() || data.as_array().unwrap().is_empty() {
            return Ok(AccountInfo::default());
        }

        let account = &data[0];
        Ok(AccountInfo {
            address: account["address"].as_str().unwrap_or_default().to_string(),
            balance: account["balance"].as_u64().unwrap_or(0),
            create_time: account["create_time"].as_u64().unwrap_or(0),
            latest_operation_time: account["latest_opration_time"].as_u64().unwrap_or(0),
        })
    }

    pub async fn get_account_full(&self, address: &str) -> Result<AccountResource, reqwest::Error> {
        let url = format!("{}/v1/accounts/{}", self.base_url, address);
        let resp: serde_json::Value = self.client.get(&url).send().await?.json().await?;

        let data = &resp["data"];
        if data.is_null() || !data.is_array() || data.as_array().unwrap().is_empty() {
            return Ok(AccountResource::default());
        }

        let account = &data[0];
        let balance = account["balance"].as_u64().unwrap_or(0);

        // Parse frozen balances from frozenV2
        let mut frozen_bandwidth = 0u64;
        let mut frozen_energy = 0u64;
        if let Some(frozen_v2) = account["frozenV2"].as_array() {
            for frozen in frozen_v2 {
                let amount = frozen["amount"].as_u64().unwrap_or(0);
                let resource = frozen["type"].as_str().unwrap_or("BANDWIDTH");
                match resource {
                    "ENERGY" => frozen_energy += amount,
                    _ => frozen_bandwidth += amount,
                }
            }
        }

        // Parse TRON Power (votes give voting power)
        let tron_power = frozen_bandwidth + frozen_energy;

        // Parse bandwidth
        let bandwidth_limit = account["bandwidth"].as_u64().unwrap_or(0);
        let bandwidth_used = account["bandwidthUsed"].as_u64().unwrap_or(0);

        // Parse energy
        let energy_limit = account["account_resource"]["energy_limit"].as_u64().unwrap_or(0);
        let energy_used = account["account_resource"]["energy_used"].as_u64().unwrap_or(0);

        // Parse TRC-20 tokens
        let mut trc20_tokens = Vec::new();
        if let Some(trc20_array) = account["trc20"].as_array() {
            for trc20 in trc20_array {
                if let Some(obj) = trc20.as_object() {
                    for (contract, balance_val) in obj {
                        let balance_str = balance_val.as_str().unwrap_or("0").to_string();
                        trc20_tokens.push(Trc20Token {
                            contract_address: contract.clone(),
                            symbol: String::new(),
                            name: String::new(),
                            balance: balance_str,
                            decimals: 6, // Default, should be fetched from contract
                        });
                    }
                }
            }
        }

        // Parse unfrozenV2 (pending withdrawals)
        let mut unfrozen_list = Vec::new();
        let mut withdrawable_balance = 0u64;
        let now_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        if let Some(unfrozen_v2) = account["unfrozenV2"].as_array() {
            for unfrozen in unfrozen_v2 {
                let amount = unfrozen["unfreeze_amount"].as_u64().unwrap_or(0);
                let expire_time = unfrozen["unfreeze_expire_time"].as_u64().unwrap_or(0);
                if amount > 0 {
                    if expire_time <= now_ms {
                        withdrawable_balance += amount;
                    }
                    unfrozen_list.push(UnfreezeInfo {
                        amount,
                        unfreeze_expire_time: expire_time,
                    });
                }
            }
        }

        Ok(AccountResource {
            bandwidth_limit,
            bandwidth_used,
            energy_limit,
            energy_used,
            trx_balance: balance,
            frozen_for_bandwidth: frozen_bandwidth,
            frozen_for_energy: frozen_energy,
            tron_power,
            trc20_tokens,
            unfrozen_list,
            withdrawable_balance,
        })
    }

    pub async fn get_balance(&self, address: &str) -> Result<u64, reqwest::Error> {
        let account = self.get_account(address).await?;
        Ok(account.balance)
    }

    pub async fn get_transactions(
        &self,
        address: &str,
        limit: u32,
        fingerprint: Option<&str>,
    ) -> Result<(Vec<TransactionRecord>, Option<String>), reqwest::Error> {
        let mut url = format!(
            "{}/v1/accounts/{}/transactions?limit={}&order_by=block_timestamp,desc",
            self.base_url, address, limit
        );
        if let Some(fp) = fingerprint {
            url.push_str(&format!("&fingerprint={}", fp));
        }

        let resp: serde_json::Value = self.client.get(&url).send().await?.json().await?;

        let mut transactions = Vec::new();
        if let Some(data) = resp["data"].as_array() {
            for tx in data {
                let raw = &tx["raw_data"];
                let contract = &raw["contract"][0];

                transactions.push(TransactionRecord {
                    tx_id: tx["txID"].as_str().unwrap_or_default().to_string(),
                    block_number: tx["blockNumber"].as_u64().unwrap_or(0),
                    block_timestamp: tx["blockTimeStamp"].as_u64().unwrap_or(0),
                    owner_address: contract["parameter"]["value"]["owner_address"]
                        .as_str().map(|s| s.to_string()),
                    to_address: contract["parameter"]["value"]["to_address"]
                        .as_str().map(|s| s.to_string()),
                    amount: contract["parameter"]["value"]["amount"].as_u64(),
                    contract_type: contract["type"].as_str().map(|s| s.to_string()),
                    confirmed: tx["confirmed"].as_bool(),
                });
            }
        }

        let fingerprint = resp["meta"]["fingerprint"].as_str().map(|s| s.to_string());
        Ok((transactions, fingerprint))
    }

    pub async fn broadcast_transaction(&self, transaction: &serde_json::Value) -> Result<serde_json::Value, reqwest::Error> {
        let url = format!("{}/wallet/broadcasttransaction", self.base_url);
        let resp = self.client.post(&url)
            .json(transaction)
            .send()
            .await?
            .json()
            .await?;
        Ok(resp)
    }

    pub async fn get_trx_price(&self) -> Result<serde_json::Value, reqwest::Error> {
        let url = "https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd&include_24hr_change=true&include_market_cap=true";
        let resp: serde_json::Value = self.client.get(url).send().await?.json().await?;
        Ok(resp)
    }

    pub async fn get_now_block(&self) -> Result<u64, reqwest::Error> {
        let url = format!("{}/wallet/getnowblock", self.base_url);
        let resp: serde_json::Value = self.client.post(&url).send().await?.json().await?;
        let block_number = resp["block_header"]["raw_data"]["number"].as_u64().unwrap_or(0);
        Ok(block_number)
    }
}
