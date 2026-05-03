use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct NFTTicket {
    pub token_id: String,
    pub contract_address: String,
    pub name: Option<String>,
    pub image_url: Option<String>,
    pub collection: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Serialize, Deserialize)]
pub struct NFTToken {
    pub token_id: String,
    pub contract_address: String,
    pub name: Option<String>,
    pub image_url: Option<String>,
    pub collection: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

/// Fetch NFT tickets (TRC-1155 style) for an address via TRONScan API
#[tauri::command]
pub async fn get_nft_tickets(
    address: String,
    network: String,
) -> Result<Vec<NFTTicket>, String> {
    // Use TRONScan API for NFT data
    let base_url = if network == "shasta" {
        "https://apilist.tronscanapi.com/api"
    } else {
        "https://apilist.tronscanapi.com/api"
    };

    let client = reqwest::Client::new();
    let url = format!(
        "{}?address={}",
        base_url, address
    );

    // Try TRONScan NFT endpoint
    let nft_url = format!(
        "https://apilist.tronscanapi.com/api/account/nft?address={}&limit=50",
        address
    );

    let resp: serde_json::Value = client.get(&nft_url)
        .header("TRON-PRO-API-KEY", "") // Optional, can add key later
        .send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;

    let mut tickets: Vec<NFTTicket> = Vec::new();

    // Parse TRONScan response
    if let Some(data) = resp["data"].as_array() {
        for item in data {
            let token_id = item["token_id"].as_str()
                .or_else(|| item["tokenId"].as_str())
                .unwrap_or("0")
                .to_string();

            let contract_address = item["contract_address"].as_str()
                .or_else(|| item["contractAddress"].as_str())
                .unwrap_or("")
                .to_string();

            let name = item["name"].as_str()
                .or_else(|| item["token_name"].as_str())
                .map(|s| s.to_string());

            let image_url = item["image_url"].as_str()
                .or_else(|| item["img_url"].as_str())
                .or_else(|| item["logo_url"].as_str())
                .map(|s| s.to_string());

            let collection = item["collection_name"].as_str()
                .or_else(|| item["category"].as_str())
                .map(|s| s.to_string());

            let metadata = if item["metadata"].is_null() { None } else { Some(item["metadata"].clone()) };

            tickets.push(NFTTicket {
                token_id,
                contract_address,
                name,
                image_url,
                collection,
                metadata,
            });
        }
    }

    Ok(tickets)
}

/// Fetch generic NFT tokens for an address
#[tauri::command]
pub async fn get_nft(
    address: String,
    network: String,
) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();

    // TRONScan NFT API
    let nft_url = format!(
        "https://apilist.tronscanapi.com/api/account/nft?address={}&limit=100",
        address
    );

    let resp: serde_json::Value = client.get(&nft_url)
        .send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;

    // Transform to standard format
    let tokens: Vec<NFTToken> = if let Some(data) = resp["data"].as_array() {
        data.iter().map(|item| {
            NFTToken {
                token_id: item["token_id"].as_str()
                    .or_else(|| item["tokenId"].as_str())
                    .unwrap_or("0")
                    .to_string(),
                contract_address: item["contract_address"].as_str()
                    .or_else(|| item["contractAddress"].as_str())
                    .unwrap_or("")
                    .to_string(),
                name: item["name"].as_str()
                    .or_else(|| item["token_name"].as_str())
                    .map(|s| s.to_string()),
                image_url: item["image_url"].as_str()
                    .or_else(|| item["img_url"].as_str())
                    .map(|s| s.to_string()),
                collection: item["collection_name"].as_str()
                    .or_else(|| item["category"].as_str())
                    .map(|s| s.to_string()),
                metadata: if item["metadata"].is_null() { None } else { Some(item["metadata"].clone()) },
            }
        }).collect()
    } else {
        Vec::new()
    };

    Ok(serde_json::json!({
        "address": address,
        "tokens": tokens,
        "total": tokens.len(),
    }))
}