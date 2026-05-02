use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone)]
pub struct PriceApi {
    client: Client,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TokenPrice {
    pub symbol: String,
    pub price_usd: f64,
    pub price_change_24h: f64,
    pub market_cap: f64,
}

impl PriceApi {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
        }
    }

    pub async fn get_trx_price(&self) -> Result<TokenPrice, reqwest::Error> {
        let url = "https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd&include_24hr_change=true&include_market_cap=true";
        let resp: serde_json::Value = self.client.get(url).send().await?.json().await?;

        Ok(TokenPrice {
            symbol: "TRX".to_string(),
            price_usd: resp["tron"]["usd"].as_f64().unwrap_or(0.0),
            price_change_24h: resp["tron"]["usd_24h_change"].as_f64().unwrap_or(0.0),
            market_cap: resp["tron"]["usd_market_cap"].as_f64().unwrap_or(0.0),
        })
    }
}
